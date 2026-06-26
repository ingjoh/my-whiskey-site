'use client';

import React, { useState } from 'react';
import { Sparkles, X, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface AIFieldWrapperProps {
  children: React.ReactElement;
  promptContext: string;
  onGenerate: (text: string) => void;
  currentValue?: string;
}

export default function AIFieldWrapper({
  children,
  promptContext,
  onGenerate,
  currentValue = ''
}: AIFieldWrapperProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [tone, setTone] = useState('Luxury & Exclusive');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [error, setError] = useState('');

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGeneratedText('');
    setError('');
    setInstruction('');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const token = user ? await user.getIdToken() : '';
      const response = await fetch('/api/admin/ai/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          promptContext,
          instruction,
          tone,
          currentValue
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate text');
      }

      setGeneratedText(data.text || '');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    onGenerate(generatedText);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%', display: 'block' }}>
      {/* Target input/textarea child */}
      {children}

      {/* Floating Sparkles Button */}
      <button
        onClick={handleOpen}
        type="button"
        title={`AI Writer Helper: ${promptContext}`}
        style={{
          position: 'absolute',
          top: '0.4rem',
          right: '0.4rem',
          zIndex: 10,
          background: 'rgba(217, 119, 6, 0.1)',
          border: '1px solid rgba(217, 119, 6, 0.2)',
          borderRadius: '4px',
          color: '#d97706',
          padding: '0.25rem 0.4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none',
          boxShadow: '0 0 10px rgba(217, 119, 6, 0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(217, 119, 6, 0.25)';
          e.currentTarget.style.boxShadow = '0 0 12px rgba(217, 119, 6, 0.3)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(217, 119, 6, 0.1)';
          e.currentTarget.style.boxShadow = '0 0 10px rgba(217, 119, 6, 0.1)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Sparkles size={13} style={{ marginRight: '0.2rem' }} />
        <span style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>AI</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1.5rem',
          fontFamily: "var(--font-sans, 'Inter', sans-serif)"
        }}>
          <div style={{
            background: 'var(--color-surface, #171717)',
            border: '1px solid var(--color-border, #27272a)',
            borderRadius: 'var(--radius-lg, 0.5rem)',
            width: '100%',
            maxWidth: '550px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 0 25px rgba(217, 119, 6, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            color: 'var(--color-foreground, #ededed)',
            animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="#d97706" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em', fontFamily: "var(--font-heading)" }}>
                  AI Writer Helper
                </h3>
              </div>
              <button
                onClick={handleClose}
                type="button"
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', padding: '0.2rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', maxHeight: '70vh' }}>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '4px', borderLeft: '3px solid #d97706' }}>
                Context: <strong>{promptContext}</strong>
              </div>

              {/* Instructions Prompt */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  User Instructions / Bullet Points
                </label>
                <textarea
                  placeholder="e.g. 'Write a detailed bio for Captain Jack highlighting 15 years in the Caribbean and a safety-first mindset'"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  rows={3}
                  style={{
                    background: '#121416',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    padding: '0.6rem',
                    color: '#F4F1EA',
                    outline: 'none',
                    resize: 'vertical',
                    fontSize: '0.825rem',
                    lineHeight: '1.4'
                  }}
                />
              </div>

              {/* Tone Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Brand Voice Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  style={{
                    background: '#121416',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    padding: '0.6rem',
                    color: '#F4F1EA',
                    outline: 'none',
                    fontSize: '0.825rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Luxury & Exclusive">Luxury & Exclusive (Sleek, elite, premium)</option>
                  <option value="Adventurous & Fun">Adventurous & Fun (Exciting, energetic, friendly)</option>
                  <option value="Professional & Safe">Professional & Safe (Trustworthy, reliable, calm)</option>
                  <option value="Casual & Warm">Casual & Warm (Inviting, comfortable, relaxed)</option>
                </select>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                style={{
                  background: 'var(--color-primary, #d97706)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'opacity 0.2s',
                  opacity: isGenerating ? 0.6 : 1
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating copy...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Copy
                  </>
                )}
              </button>

              {/* Error Alert */}
              {error && (
                <div style={{ color: '#ef4444', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.6rem 0.8rem', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {error}
                </div>
              )}

              {/* Generated Result Preview */}
              {generatedText && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', animation: 'fadeIn 0.2s ease' }}>
                  <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Generated Copy Preview
                  </label>
                  <div style={{
                    background: '#0d0f11',
                    border: '1px solid rgba(217, 119, 6, 0.25)',
                    borderRadius: '6px',
                    padding: '0.8rem',
                    color: '#F4F1EA',
                    fontSize: '0.825rem',
                    lineHeight: '1.5',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {generatedText}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {generatedText && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(0, 0, 0, 0.2)'
              }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.8)',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Check size={14} /> Use Generated Text
                </button>
              </div>
            )}
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes scaleIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            .animate-spin {
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}} />
        </div>
      )}
    </div>
  );
}
