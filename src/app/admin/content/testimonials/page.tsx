'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Anchor, ChevronLeft, Loader2, Star, CheckCircle, 
  Trash2, Archive, MessageSquare, AlertCircle, Award
} from 'lucide-react';

export default function TestimonialModeration() {
  const { user } = useAuth();
  const router = useRouter();

  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Verify admin access
  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then((tokenResult) => {
        const claims = tokenResult.claims;
        const hasAdminAccess = !!(claims.admin || claims.roles);
        if (!hasAdminAccess) {
          router.push('/login');
        }
      }).catch(() => {
        router.push('/login');
      });
    } else {
      router.push('/login');
    }
  }, [user, router]);

  const fetchTestimonials = async () => {
    try {
      const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setTestimonials(list);
    } catch (err) {
      console.error('Error fetching testimonials:', err);
      showToast('error', 'Failed to load testimonials.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'archived') => {
    setIsUpdating(id);
    try {
      const ref = doc(db, 'testimonials', id);
      await updateDoc(ref, { status: newStatus });
      setTestimonials(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      showToast('success', `Testimonial successfully marked as ${newStatus}.`);
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast('error', 'Failed to update testimonial status.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleToggleFeatured = async (id: string, currentFeatured: boolean) => {
    setIsUpdating(id);
    try {
      const ref = doc(db, 'testimonials', id);
      await updateDoc(ref, { featured: !currentFeatured });
      setTestimonials(prev => prev.map(t => t.id === id ? { ...t, featured: !currentFeatured } : t));
      showToast('success', !currentFeatured ? 'Testimonial marked as Featured!' : 'Removed from Featured.');
    } catch (err) {
      console.error('Failed to toggle featured:', err);
      showToast('error', 'Failed to toggle featured status.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;
    setIsUpdating(id);
    try {
      const ref = doc(db, 'testimonials', id);
      await deleteDoc(ref);
      setTestimonials(prev => prev.filter(t => t.id !== id));
      showToast('success', 'Testimonial deleted successfully.');
    } catch (err) {
      console.error('Failed to delete testimonial:', err);
      showToast('error', 'Failed to delete review.');
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#D8C7AF', fontSize: '0.9rem' }}>
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.15rem', color: '#B9783B' }}>
          <MessageSquare size={20} /> Guest Testimonials & Reviews
        </div>
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toast.type === 'success' ? '#708C84' : '#EF4444',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          fontWeight: 500
        }}>
          {toast.message}
        </div>
      )}

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
            Guest Testimonial Moderation
          </h1>
          <p style={{ color: '#D8C7AF', opacity: 0.8 }}>
            Approve, feature, or archive customer recommendations and ratings. Approved testimonials can be queried dynamically to display on public site components.
          </p>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '1rem' }}>
            <Loader2 size={36} className="animate-spin" style={{ color: '#B9783B' }} />
            <span style={{ color: '#D8C7AF' }}>Loading testimonials...</span>
          </div>
        ) : testimonials.length === 0 ? (
          <div style={{ padding: '4rem 2rem', background: '#1E2124', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <MessageSquare size={48} style={{ color: '#B9783B', opacity: 0.5, margin: '0 auto 1rem auto' }} />
            <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>No Testimonials Found</h3>
            <p style={{ color: '#D8C7AF', opacity: 0.7, margin: 0 }}>Guest submissions will appear here once they complete excursions.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {testimonials.map((t) => (
              <div 
                key={t.id}
                style={{
                  background: '#1E2124',
                  border: t.featured ? '1px solid rgba(233, 196, 106, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  padding: '1.5rem 2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative'
                }}
              >
                {/* Header Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: 'white', margin: '0 0 0.25rem 0', fontWeight: 650 }}>
                      {t.guestName}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.7 }}>
                      Excursion: <strong>{t.experienceTitle}</strong> | Submitted: {new Date(t.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Rating Stars & Status Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.1rem', color: '#E9C46A' }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={16} fill={i < t.rating ? '#E9C46A' : 'none'} stroke={i < t.rating ? 'none' : '#E9C46A'} />
                      ))}
                    </div>

                    {t.status === 'pending_moderation' && (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(185, 120, 59, 0.15)', border: '1px solid #B9783B', color: '#B9783B', padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                        Pending Review
                      </span>
                    )}
                    {t.status === 'approved' && (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(112, 140, 132, 0.15)', border: '1px solid #708C84', color: '#708C84', padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                        Approved
                      </span>
                    )}
                    {t.status === 'archived' && (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.4)', padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                        Archived
                      </span>
                    )}

                    {t.featured && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', background: 'rgba(233, 196, 106, 0.15)', border: '1px solid #E9C46A', color: '#E9C46A', padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                        <Award size={10} /> Featured
                      </span>
                    )}
                  </div>
                </div>

                {/* Testimonial Text */}
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#F4F1EA', opacity: 0.9, fontStyle: 'italic', lineHeight: 1.5, background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '6px', borderLeft: '3px solid #B9783B' }}>
                  "{t.text}"
                </p>

                {/* Moderation Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {t.status !== 'approved' && (
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'approved')}
                        disabled={isUpdating === t.id}
                        style={{
                          background: '#708C84',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                      >
                        <CheckCircle size={14} /> Approve & Publish
                      </button>
                    )}

                    {t.status === 'approved' && (
                      <button
                        onClick={() => handleToggleFeatured(t.id, t.featured)}
                        disabled={isUpdating === t.id}
                        style={{
                          background: 'transparent',
                          border: '1px solid #E9C46A',
                          color: '#E9C46A',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(233,196,106,0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Award size={14} /> {t.featured ? 'Unfeature' : 'Feature Review'}
                      </button>
                    )}

                    {t.status !== 'archived' && (
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'archived')}
                        disabled={isUpdating === t.id}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#D8C7AF',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'}
                        onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
                      >
                        <Archive size={14} /> Archive
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={isUpdating === t.id}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#EF4444',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      opacity: 0.7,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = '1'}
                    onMouseOut={e => e.currentTarget.style.opacity = '0.7'}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
