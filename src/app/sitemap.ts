import { MetadataRoute } from 'next';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://mywhiskey.com';
  
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  try {
    const pagesSnapshot = await getDocs(collection(db, 'pages'));
    pagesSnapshot.forEach((doc) => {
      const pageId = doc.id;
      // Skip the index page if it exists as a document, since it's already mapped to /
      if (pageId !== 'home' && pageId !== 'index') {
        routes.push({
          url: `${baseUrl}/${pageId}`,
          lastModified: new Date(),
          changeFrequency: 'monthly',
          priority: 0.8,
        });
      }
    });
  } catch (error) {
    console.error("Error generating sitemap from Firestore:", error);
  }

  return routes;
}
