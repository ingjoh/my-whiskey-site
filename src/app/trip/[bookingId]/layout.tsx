import { Metadata } from 'next';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params
}: {
  params: Promise<{ bookingId: string }>
}): Promise<Metadata> {
  try {
    const { bookingId } = await params;
    if (!bookingId) {
      return { title: 'M/Y Whiskey Voyage' };
    }

    let resolvedBookingId = bookingId;
    let bookingDetails = null;

    // Resolve booking ID if token is provided
    if (bookingId.startsWith('tkn_')) {
      const pagesSnap = await adminDb.collection('pages')
        .where('type', '==', 'booking')
        .where('token', '==', bookingId)
        .limit(1)
        .get();

      if (!pagesSnap.empty) {
        bookingDetails = pagesSnap.docs[0].data();
        resolvedBookingId = bookingDetails.id || resolvedBookingId;
      } else {
        const bookingsSnap = await adminDb.collection('bookings')
          .where('token', '==', bookingId)
          .limit(1)
          .get();
        if (!bookingsSnap.empty) {
          bookingDetails = bookingsSnap.docs[0].data();
          const rawId = bookingDetails.id || '';
          resolvedBookingId = rawId.startsWith('book_') ? rawId.replace('book_', '') : rawId;
        }
      }
    } else {
      const bookingSnap = await adminDb.collection('bookings').doc(bookingId).get();
      bookingDetails = bookingSnap.exists ? bookingSnap.data() : null;
      if (!bookingDetails) {
        const legacySnap = await adminDb.collection('pages').doc(`booking-${bookingId}`).get();
        if (legacySnap.exists) {
          bookingDetails = legacySnap.data();
        }
      }
    }

    // Fetch trip gallery details
    let coverImageUrl = '';
    let title = 'Your Voyage Memories';
    let description = 'Relive your luxury yacht excursion aboard M/Y Whiskey.';

    let galleryData: any = null;
    const possibleGalleryIds = [
      resolvedBookingId,
      bookingId,
      resolvedBookingId.startsWith('BK-') ? resolvedBookingId : `BK-${resolvedBookingId}`,
      resolvedBookingId.replace(/^BK-/, '')
    ];
    for (const gId of possibleGalleryIds) {
      const gallerySnap = await adminDb.collection('trip_galleries').doc(gId).get();
      if (gallerySnap.exists) {
        galleryData = gallerySnap.data();
        break;
      }
    }

    if (galleryData) {
      if (galleryData.title) title = galleryData.title;
      if (galleryData.description) description = galleryData.description;
      if (galleryData.coverImageUrl) {
        coverImageUrl = galleryData.coverImageUrl;
      } else if (galleryData.media && galleryData.media.length > 0) {
        const firstImg = galleryData.media.find((m: any) => m.type === 'image');
        if (firstImg) coverImageUrl = firstImg.url;
      }
    }

    const defaultMetaImage = 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?q=80&w=1200';
    const ogImage = coverImageUrl || defaultMetaImage;

    return {
      title: `${title} | M/Y Whiskey`,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: title
          }
        ],
        type: 'website'
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage]
      }
    };
  } catch (error) {
    console.error('Error generating metadata in trip layout:', error);
    return {
      title: 'Your Voyage Memories | M/Y Whiskey',
      description: 'Relive your luxury yacht excursion aboard M/Y Whiskey.'
    };
  }
}

export default function TripLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
