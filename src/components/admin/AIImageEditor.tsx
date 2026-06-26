'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, UploadCloud, RefreshCw, Layers, Check, X, ShieldAlert, Image as ImageIcon, ZoomIn, Crop, Brush, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { loadSiteSettings } from '@/lib/db';

interface AIImageEditorProps {
  onClose: () => void;
  onSelectImage: (url: string) => void;
  currentImageUrl?: string;
  contextText?: string;
}

export default function AIImageEditor({ onClose, onSelectImage, currentImageUrl, contextText }: AIImageEditorProps) {
  const { user } = useAuth();
  
  // Tabs: 'generate' | 'edit' | 'outpaint' | 'upscale' | 'create-ad'
  const [activeAction, setActiveAction] = useState<'generate' | 'edit' | 'outpaint' | 'upscale' | 'create-ad'>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);

  // Text to Image States
  const [prompt, setPrompt] = useState(contextText || '');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '4:3' | '9:16'>('1:1');

  // Edit / Inpainting States
  const [sourceImage, setSourceImage] = useState<string | null>(currentImageUrl || null);
  const [brushSize, setBrushSize] = useState<number>(30);
  const [editMode, setEditMode] = useState<'inpainting-insert' | 'inpainting-replace'>('inpainting-insert');
  const [editPrompt, setEditPrompt] = useState(contextText || '');

  // Crop / Outpainting States
  const [outpaintPrompt, setOutpaintPrompt] = useState(contextText || '');
  const [outpaintAspectRatio, setOutpaintAspectRatio] = useState<'16:9' | '4:3' | '1:1'>('16:9');

  // Upscale States
  const [upscaleFactor, setUpscaleFactor] = useState<2 | 4>(2);

  // Ad Creator States
  const [adCopy, setAdCopy] = useState(contextText || '');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [adAspectRatio, setAdAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:5'>('1:1');
  const [siteSettings, setSiteSettings] = useState<any>(null);

  // Strategy Directions planning states
  const [adDirections, setAdDirections] = useState<any[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [selectedDirIdx, setSelectedDirIdx] = useState<number | null>(null);
  const [selectedDirIds, setSelectedDirIds] = useState<number[]>([0]);
  const [adPrompt, setAdPrompt] = useState('');

  // Multi-variant generated outputs
  const [successUrls, setSuccessUrls] = useState<string[]>([]);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);

  // Load site settings for branding
  useEffect(() => {
    async function fetchBrandSettings() {
      try {
        const settingsData = await loadSiteSettings();
        if (settingsData) {
          setSiteSettings(settingsData);
        }
      } catch (err) {
        console.error('Failed to load site settings in AIImageEditor:', err);
      }
    }
    fetchBrandSettings();
  }, []);

  const handleGenerateDirections = async () => {
    setIsPlanning(true);
    setErrorMsg(null);
    try {
      const idToken = user ? await user.getIdToken() : '';
      const companyName = siteSettings?.general?.siteName || 'M/Y Whiskey';
      const colors = siteSettings?.brand?.colors || [];
      const brandGuidePrompt = siteSettings?.brand?.brandSystemPrompt || '';

      const response = await fetch('/api/admin/ai/ad-directions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          adCopy,
          brandGuidePrompt,
          companyName,
          colors
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate ad directions.');
      }

      const data = await response.json();
      if (data.directions && data.directions.length > 0) {
        setAdDirections(data.directions);
        setSelectedDirIdx(0);
        setSelectedDirIds([0]);
        setAdPrompt(data.directions[0].prompt);
      } else {
        throw new Error('No design directions returned.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate design strategy.');
    } finally {
      setIsPlanning(false);
    }
  };

  // Automatically plan directions when entering ad creator
  useEffect(() => {
    if (activeAction === 'create-ad' && adCopy && adDirections.length === 0 && siteSettings) {
      handleGenerateDirections();
    }
  }, [activeAction, adCopy, siteSettings]);

  // Canvas Refs for Inpainting
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Load currentImageUrl if provided
  useEffect(() => {
    if (currentImageUrl) {
      setSourceImage(currentImageUrl);
      setActiveAction('create-ad');
    }
  }, [currentImageUrl]);

  // Sync ad copy with contextText
  useEffect(() => {
    if (contextText) {
      setAdCopy(contextText);
    }
  }, [contextText]);

  // Redraw image and mask canvas when sourceImage change
  useEffect(() => {
    if (sourceImage && (activeAction === 'edit' || activeAction === 'create-ad')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Calculate fit dimensions inside container
        const maxW = 500;
        const maxH = 400;
        let w = img.width;
        let h = img.height;

        if (w > maxW) {
          h = (maxW / w) * h;
          w = maxW;
        }
        if (h > maxH) {
          w = (maxH / h) * w;
          h = maxH;
        }

        setImageSize({ width: w, height: h });

        // Draw image canvas
        const imgCanvas = imageCanvasRef.current;
        if (imgCanvas) {
          imgCanvas.width = w;
          imgCanvas.height = h;
          const ctx = imgCanvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
        }

        // Initialize mask canvas to transparent
        const maskCanvas = maskCanvasRef.current;
        if (maskCanvas) {
          maskCanvas.width = w;
          maskCanvas.height = h;
          const ctx = maskCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.fillRect(0, 0, w, h);
          }
        }
      };
      img.src = sourceImage;
    }
  }, [sourceImage, activeAction]);

  // Drawing event handlers on mask canvas
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleStartDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeAction === 'create-ad') return;
    setIsDrawing(true);
    const pos = getMousePos(e);
    const canvas = maskCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Draw orange visible stroke on screen
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)';
    }
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeAction === 'create-ad') return;
    if (!isDrawing) return;
    const pos = getMousePos(e);
    const canvas = maskCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handleStopDrawing = () => {
    setIsDrawing(false);
  };

  const clearMask = () => {
    const canvas = maskCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Convert mask canvas to black/white binary mask expected by Vertex AI
  const getBinaryMaskBase64 = (): string => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return '';

    // Create a temporary offscreen canvas of the same dimensions
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const oCtx = offscreen.getContext('2d');
    if (!oCtx) return '';

    // Fill offscreen with solid black (0x000000)
    oCtx.fillStyle = '#000000';
    oCtx.fillRect(0, 0, offscreen.width, offscreen.height);

    // Read mask data to convert any drawn pixels to white (#ffffff)
    const srcCtx = canvas.getContext('2d');
    if (!srcCtx) return '';
    const imgData = srcCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Create an image data on offscreen to paint white pixels
    const destImgData = oCtx.createImageData(canvas.width, canvas.height);
    const destData = destImgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 10) {
        // Pixel was painted, write white
        destData[i] = 255;
        destData[i + 1] = 255;
        destData[i + 2] = 255;
        destData[i + 3] = 255;
      } else {
        // Write black
        destData[i] = 0;
        destData[i + 1] = 0;
        destData[i + 2] = 0;
        destData[i + 3] = 255;
      }
    }
    oCtx.putImageData(destImgData, 0, 0);

    return offscreen.toDataURL('image/png');
  };

  const getSolidWhiteMaskBase64 = (): string => {
    const w = imageSize.width || 500;
    const h = imageSize.height || 400;
    
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const oCtx = offscreen.getContext('2d');
    if (!oCtx) return '';
    
    oCtx.fillStyle = '#ffffff';
    oCtx.fillRect(0, 0, w, h);
    
    return offscreen.toDataURL('image/png');
  };

  // Get source image as clean base64
  const getSourceImageBase64 = async (): Promise<string> => {
    if (!sourceImage) return '';
    
    // If it is already a base64, return it
    if (sourceImage.startsWith('data:')) {
      return sourceImage;
    }

    // Otherwise fetch the URL and convert it to Base64
    try {
      const response = await fetch(sourceImage);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('Failed to convert image to base64:', err);
      // Fallback: draw image on an offscreen canvas and convert
      const imgCanvas = imageCanvasRef.current;
      if (imgCanvas) {
        return imgCanvas.toDataURL('image/webp');
      }
      return '';
    }
  };

  // Image Upload helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSourceImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit trigger
  const handleExecuteAction = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const idToken = user ? await user.getIdToken() : '';
      let payload: any = { action: activeAction };

      if (activeAction === 'generate') {
        payload.prompt = prompt;
        payload.aspectRatio = aspectRatio;
      } else if (activeAction === 'edit') {
        if (!sourceImage) throw new Error('Source image is required.');
        const srcB64 = await getSourceImageBase64();
        const maskB64 = getBinaryMaskBase64();
        
        payload.image = srcB64;
        payload.mask = maskB64;
        payload.prompt = editPrompt;
        payload.editMode = editMode;
        payload.aspectRatio = '1:1'; // Maintain aspect ratio for inpaint
      } else if (activeAction === 'create-ad') {
        if (!sourceImage) throw new Error('Source image is required.');
        const srcB64 = await getSourceImageBase64();
        const maskB64 = getSolidWhiteMaskBase64();
        
        setIsLoading(true);
        setErrorMsg(null);
        setSuccessUrls([]);
        setActivePreviewUrl(null);

        // Run requests in parallel for all selected direction indices
        const promises = selectedDirIds.map(async (idx) => {
          const dirPrompt = (idx === selectedDirIdx) ? adPrompt : adDirections[idx].prompt;
          
          const payload = {
            action: 'edit',
            image: srcB64,
            mask: maskB64,
            prompt: dirPrompt,
            editMode: 'inpainting-insert',
            aspectRatio: adAspectRatio
          };

          const response = await fetch('/api/admin/ai/image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `Failed to generate variant for ${adDirections[idx].title}`);
          }

          const data = await response.json();
          return data.url;
        });

        const urls = await Promise.all(promises);
        setSuccessUrls(urls);
        setActivePreviewUrl(urls[0]);
        setSuccessUrl(urls[0]);
        setSourceImage(urls[0]);
        clearMask();
        return;
      } else if (activeAction === 'outpaint') {
        if (!sourceImage) throw new Error('Source image is required.');
        const srcB64 = await getSourceImageBase64();
        
        payload.image = srcB64;
        payload.prompt = outpaintPrompt;
        payload.editMode = 'outpainting';
        payload.aspectRatio = outpaintAspectRatio;
      } else if (activeAction === 'upscale') {
        if (!sourceImage) throw new Error('Source image is required.');
        const srcB64 = await getSourceImageBase64();
        
        payload.image = srcB64;
        payload.upscaleFactor = upscaleFactor;
      }

      const response = await fetch('/api/admin/ai/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to complete image editing task.');
      }

      const data = await response.json();
      if (data.url) {
        setSuccessUrl(data.url);
        // If we finished a modify, let the user preview the result
        setSourceImage(data.url);
        clearMask();
      } else {
        throw new Error('Image URL missing in response.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred during image generation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(8px)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: '#ededed'
    }}>
      <div style={{
        background: '#0d0e10', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', width: '90%', maxWidth: '960px', height: '80vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
      }}>
        
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={20} color="#d97706" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', fontFamily: "var(--font-heading)" }}>
              Vertex AI Imagen 3 Creative Sandbox
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Tabs Selector */}
        <div style={{
          display: 'flex', background: '#121417', borderBottom: '1px solid rgba(255,255,255,0.04)',
          padding: '0 1rem'
        }}>
          {[
            { id: 'create-ad', label: 'AI Ad Creator', icon: <Sparkles size={14} /> },
            { id: 'generate', label: 'Text-to-Image', icon: <ImageIcon size={14} /> },
            { id: 'edit', label: 'Inpaint / Edit', icon: <Brush size={14} /> },
            { id: 'outpaint', label: 'Expand / Crop', icon: <Crop size={14} /> },
            { id: 'upscale', label: 'Upscaler', icon: <ZoomIn size={14} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveAction(tab.id as any);
                setSuccessUrl(null);
                setErrorMsg(null);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '1rem 1.25rem', border: 'none', background: 'transparent',
                color: activeAction === tab.id ? '#d97706' : 'rgba(255,255,255,0.5)',
                borderBottom: activeAction === tab.id ? '2px solid #d97706' : '2px solid transparent',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* Left Side: Sandbox Canvas Panel */}
          <div style={{
            flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: '#0a0a0b',
            borderRight: '1px solid rgba(255,255,255,0.06)', position: 'relative'
          }} ref={containerRef}>
            
            {activeAction === 'generate' && !successUrl && (
              <div style={{ textAlign: 'center', maxWidth: '300px', opacity: 0.6 }}>
                <ImageIcon size={48} style={{ margin: '0 auto 1rem', color: '#d97706' }} />
                <p style={{ fontSize: '0.85rem' }}>Write a prompt on the right to generate a luxury WebP image with Google Imagen 3.</p>
              </div>
            )}

            {activeAction === 'generate' && successUrl && (
              <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src={successUrl} alt="Generated result" style={{ maxWidth: '100%', maxHeight: '360px', display: 'block', objectFit: 'contain' }} />
              </div>
            )}

            {/* Inpainting drawing board */}
            {(activeAction === 'edit' || activeAction === 'create-ad') && (
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {!sourceImage ? (
                  <div style={{
                    border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '8px',
                    padding: '2.5rem 1.5rem', textAlign: 'center', width: '320px', cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('upload-img-file')?.click()}
                  >
                    <UploadCloud size={32} style={{ margin: '0 auto 0.75rem', color: '#B9783B' }} />
                    <span style={{ fontSize: '0.825rem', display: 'block', fontWeight: 600 }}>
                      {activeAction === 'create-ad' ? 'Upload Image for Ad Creative' : 'Upload Image to edit'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem', display: 'block' }}>Supports webp, png, jpeg</span>
                    <input type="file" id="upload-img-file" style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: imageSize.width, height: imageSize.height, border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', overflow: 'hidden' }}>
                      <canvas ref={imageCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                      <canvas
                        ref={maskCanvasRef}
                        onMouseDown={handleStartDrawing}
                        onMouseMove={handleDraw}
                        onMouseUp={handleStopDrawing}
                        onMouseLeave={handleStopDrawing}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          cursor: activeAction === 'create-ad' ? 'default' : 'crosshair',
                          zIndex: 10
                        }}
                      />
                    </div>
                    {/* Multi-variant result selector below canvas */}
                    {activeAction === 'create-ad' && successUrls.length > 0 && (
                      <div style={{ marginTop: '1.25rem', width: '100%', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Select Ad Variant Output
                        </span>
                        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', overflowX: 'auto', padding: '0.2rem 0' }}>
                          {successUrls.map((url, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setActivePreviewUrl(url);
                                const imgCanvas = imageCanvasRef.current;
                                if (imgCanvas) {
                                  const ctx = imgCanvas.getContext('2d');
                                  const img = new Image();
                                  img.crossOrigin = 'anonymous';
                                  img.onload = () => {
                                    ctx?.drawImage(img, 0, 0, imageSize.width, imageSize.height);
                                  };
                                  img.src = url;
                                }
                              }}
                              style={{
                                width: '54px', height: '54px', borderRadius: '6px', overflow: 'hidden',
                                border: activePreviewUrl === url ? '2px solid #d97706' : '1px solid rgba(255,255,255,0.15)',
                                cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
                                boxShadow: activePreviewUrl === url ? '0 0 10px rgba(217, 119, 6, 0.4)' : 'none'
                              }}
                            >
                              <img src={url} alt={`Variant ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Outpainting resizing board */}
            {activeAction === 'outpaint' && (
              <div>
                {!sourceImage ? (
                  <div style={{
                    border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '8px',
                    padding: '2.5rem 1.5rem', textAlign: 'center', width: '320px', cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('upload-img-file-out')?.click()}
                  >
                    <UploadCloud size={32} style={{ margin: '0 auto 0.75rem', color: '#B9783B' }} />
                    <span style={{ fontSize: '0.825rem', display: 'block', fontWeight: 600 }}>Upload Image to expand</span>
                    <input type="file" id="upload-img-file-out" style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />
                  </div>
                ) : (
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ position: 'relative', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden', maxWidth: '350px' }}>
                      <img src={sourceImage} alt="Source for outpaint" style={{ width: '100%', display: 'block', maxHeight: '280px', objectFit: 'contain' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upscale board */}
            {activeAction === 'upscale' && (
              <div>
                {!sourceImage ? (
                  <div style={{
                    border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '8px',
                    padding: '2.5rem 1.5rem', textAlign: 'center', width: '320px', cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('upload-img-file-up')?.click()}
                  >
                    <UploadCloud size={32} style={{ margin: '0 auto 0.75rem', color: '#B9783B' }} />
                    <span style={{ fontSize: '0.825rem', display: 'block', fontWeight: 600 }}>Upload Image to upscale</span>
                    <input type="file" id="upload-img-file-up" style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />
                  </div>
                ) : (
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ position: 'relative', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden', maxWidth: '350px' }}>
                      <img src={sourceImage} alt="Source to upscale" style={{ width: '100%', display: 'block', maxHeight: '280px', objectFit: 'contain' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Floating Action Spinner */}
            {isLoading && (
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(5,5,5,0.8)', zIndex: 100, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '1rem'
              }}>
                <div style={{
                  width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)',
                  borderTop: '3px solid #d97706', borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>
                  {activeAction === 'generate' && 'Generating Yacht Image with Imagen 3...'}
                  {activeAction === 'edit' && 'Inpainting selected elements...'}
                  {activeAction === 'create-ad' && `Generating ${selectedDirIds.length} ad layout variant${selectedDirIds.length > 1 ? 's' : ''} in parallel...`}
                  {activeAction === 'outpaint' && 'Expanding image boundaries...'}
                  {activeAction === 'upscale' && 'Upscaling and clarifying resolution...'}
                </span>
              </div>
            )}
          </div>

          {/* Right Side: Configuration Options Panel */}
          <div style={{
            width: '320px', padding: '1.5rem', background: '#101114',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Ad Creator Controls */}
              {activeAction === 'create-ad' && sourceImage && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Ad Copy
                    </label>
                    <textarea
                      placeholder="Enter the ad text campaign copy..."
                      value={adCopy}
                      onChange={(e) => setAdCopy(e.target.value)}
                      rows={3}
                      style={{
                        background: '#16181b', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA',
                        outline: 'none', resize: 'none', fontSize: '0.8rem', lineHeight: '1.4'
                      }}
                    />
                  </div>

                  {/* Design Directions Session Block */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Ad Design Strategies
                      </span>
                      {adDirections.length > 0 && (
                        <button
                          onClick={handleGenerateDirections}
                          disabled={isPlanning}
                          style={{ background: 'transparent', border: 'none', color: '#B9783B', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <RefreshCw size={10} className={isPlanning ? 'animate-spin' : ''} />
                          Regen
                        </button>
                      )}
                    </div>

                    {isPlanning && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '1rem', background: '#16181b', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                        <RefreshCw size={20} className="animate-spin" color="#d97706" style={{ margin: '0 auto' }} />
                        <span style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>Strategizing Ad Layouts...</span>
                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                          Designing 3 high-performance directions with custom typographic overlays and seasonal accents.
                        </span>
                      </div>
                    )}

                    {!isPlanning && adDirections.length === 0 && (
                      <button
                        type="button"
                        onClick={handleGenerateDirections}
                        style={{
                          background: '#16181b', border: '1px solid rgba(255,255,255,0.08)',
                          color: '#D8C7AF', borderRadius: '6px', padding: '0.75rem',
                          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#d97706'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                      >
                        <Sparkles size={14} color="#d97706" />
                        Create Design Strategies
                      </button>
                    )}

                    {!isPlanning && adDirections.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {adDirections.map((dir, idx) => {
                          const isSelected = selectedDirIds.includes(idx);
                          const isActive = selectedDirIdx === idx;
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setSelectedDirIdx(idx);
                                setAdPrompt(dir.prompt);
                              }}
                              style={{
                                background: isActive ? 'rgba(217, 119, 6, 0.05)' : '#16181b',
                                border: isActive 
                                  ? '1px solid #d97706' 
                                  : isSelected 
                                    ? '1px solid rgba(217, 119, 6, 0.4)'
                                    : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '8px', padding: '0.75rem', cursor: 'pointer',
                                transition: 'all 0.2s', position: 'relative'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (e.target.checked) {
                                      setSelectedDirIds([...selectedDirIds, idx]);
                                    } else {
                                      if (selectedDirIds.length > 1) {
                                        setSelectedDirIds(selectedDirIds.filter(id => id !== idx));
                                      }
                                    }
                                  }}
                                  style={{ marginTop: '0.2rem', accentColor: '#d97706', cursor: 'pointer' }}
                                />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isActive ? '#d97706' : '#F4F1EA', letterSpacing: '-0.01em', marginBottom: '0.15rem' }}>
                                    {dir.title}
                                  </div>
                                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                                    {dir.styleDescription}
                                  </div>
                                  <div style={{ fontSize: '0.65rem', color: '#D8C7AF', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                    Overlay: "{dir.headline}"
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Active Prompt Tweak Textarea */}
                  {!isPlanning && adDirections.length > 0 && selectedDirIdx !== null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Tweak Active Prompt ({adDirections[selectedDirIdx]?.title})
                      </label>
                      <textarea
                        value={adPrompt}
                        onChange={(e) => setAdPrompt(e.target.value)}
                        rows={4}
                        style={{
                          background: '#16181b', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA',
                          outline: 'none', resize: 'vertical', fontSize: '0.72rem', lineHeight: '1.4',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>
                      Ad Aspect Ratio
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                      {(['1:1', '4:5', '9:16', '16:9'] as const).map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setAdAspectRatio(ratio)}
                          style={{
                            padding: '0.4rem 0', background: adAspectRatio === ratio ? 'rgba(217, 119, 6, 0.12)' : 'rgba(0,0,0,0.2)',
                            border: adAspectRatio === ratio ? '1px solid #d97706' : '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '4px', color: adAspectRatio === ratio ? 'white' : '#D8C7AF',
                            fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          {ratio === '4:5' ? '4:5 (Feed)' : ratio === '9:16' ? '9:16 (Story)' : ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Text-to-Image Generation Controls */}
              {activeAction === 'generate' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Prompt Description
                    </label>
                    <textarea
                      placeholder="e.g. 'A sleek luxury yacht sailing in Destin during a vibrant sunset, highly detailed, professional photography, cinematic lighting'"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      style={{
                        background: '#16181b', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA',
                        outline: 'none', resize: 'none', fontSize: '0.825rem', lineHeight: '1.4'
                      }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>
                      Aspect Ratio
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                      {(['1:1', '16:9', '4:3', '9:16'] as const).map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setAspectRatio(ratio)}
                          style={{
                            padding: '0.4rem 0', background: aspectRatio === ratio ? 'rgba(217, 119, 6, 0.12)' : 'rgba(0,0,0,0.2)',
                            border: aspectRatio === ratio ? '1px solid #d97706' : '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '4px', color: aspectRatio === ratio ? '#white' : '#D8C7AF',
                            fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Inpaint / Edit Controls */}
              {activeAction === 'edit' && sourceImage && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>
                        Brush size ({brushSize}px)
                      </label>
                      <button
                        onClick={clearMask}
                        style={{
                          background: 'transparent', border: 'none', color: '#ef4444',
                          fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem',
                          cursor: 'pointer', padding: 0
                        }}
                      >
                        <Trash2 size={12} />
                        Clear Brush
                      </button>
                    </div>
                    <input
                      type="range" min="10" max="80"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#d97706', cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>
                      Edit Mode
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[
                        { id: 'inpainting-insert', label: 'Insert Object' },
                        { id: 'inpainting-replace', label: 'Replace Object' }
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setEditMode(mode.id as any)}
                          style={{
                            flex: 1, padding: '0.4rem 0',
                            background: editMode === mode.id ? 'rgba(217, 119, 6, 0.12)' : 'rgba(0,0,0,0.2)',
                            border: editMode === mode.id ? '1px solid #d97706' : '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '4px', color: editMode === mode.id ? 'white' : '#D8C7AF',
                            fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Inpaint instruction
                    </label>
                    <textarea
                      placeholder="e.g. 'Add a luxury bottle of champagne chilling in an ice bucket on the yacht deck'"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      rows={3}
                      style={{
                        background: '#16181b', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA',
                        outline: 'none', resize: 'none', fontSize: '0.8rem', lineHeight: '1.4'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Expand / Outpaint Controls */}
              {activeAction === 'outpaint' && sourceImage && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>
                      Target Aspect Ratio
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {(['16:9', '4:3', '1:1'] as const).map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setOutpaintAspectRatio(ratio)}
                          style={{
                            flex: 1, padding: '0.4rem 0',
                            background: outpaintAspectRatio === ratio ? 'rgba(217, 119, 6, 0.12)' : 'rgba(0,0,0,0.2)',
                            border: outpaintAspectRatio === ratio ? '1px solid #d97706' : '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '4px', color: outpaintAspectRatio === ratio ? 'white' : '#D8C7AF',
                            fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Fill background description
                    </label>
                    <textarea
                      placeholder="e.g. 'Expand the skies and emerald waters around the yacht, matching lighting'"
                      value={outpaintPrompt}
                      onChange={(e) => setOutpaintPrompt(e.target.value)}
                      rows={3}
                      style={{
                        background: '#16181b', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA',
                        outline: 'none', resize: 'none', fontSize: '0.8rem', lineHeight: '1.4'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Upscaler Controls */}
              {activeAction === 'upscale' && sourceImage && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>
                      Resolution Scale
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {([2, 4] as const).map((factor) => (
                        <button
                          key={factor}
                          onClick={() => setUpscaleFactor(factor)}
                          style={{
                            flex: 1, padding: '0.5rem 0',
                            background: upscaleFactor === factor ? 'rgba(217, 119, 6, 0.12)' : 'rgba(0,0,0,0.2)',
                            border: upscaleFactor === factor ? '1px solid #d97706' : '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '4px', color: upscaleFactor === factor ? 'white' : '#D8C7AF',
                            fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          {factor}x Resolution
                        </button>
                      ))}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                    Enhances image clarity and details, producing high-resolution, print-ready digital creative assets.
                  </p>
                </div>
              )}

              {/* Error messages if any */}
              {errorMsg && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px', padding: '0.75rem', display: 'flex', gap: '0.4rem', color: '#ef4444'
                }}>
                  <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <span style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Apply & Action Buttons at Bottom */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
              {(successUrl || activePreviewUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectImage((activeAction === 'create-ad' ? activePreviewUrl : successUrl) as string);
                    onClose();
                  }}
                  style={{
                    background: '#22c55e', color: 'white', border: 'none',
                    borderRadius: '6px', padding: '0.75rem', fontSize: '0.8rem',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.4rem', transition: 'all 0.2s'
                  }}
                >
                  <Check size={16} />
                  Apply to Ad Creative
                </button>
              )}


              {/* Upload image overlay buttons for edit/upscale if needed to switch source */}
              {activeAction !== 'generate' && sourceImage && (
                <button
                  type="button"
                  onClick={() => {
                    setSourceImage(null);
                    setSuccessUrl(null);
                  }}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)', borderRadius: '6px', padding: '0.6rem',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    marginBottom: '0.25rem'
                  }}
                >
                  Change Source Image
                </button>
              )}

              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={isLoading || (activeAction === 'generate' && !prompt) || (activeAction !== 'generate' && !sourceImage)}
                style={{
                  background: isLoading ? 'rgba(255,255,255,0.05)' : '#d97706',
                  color: isLoading ? 'rgba(255,255,255,0.3)' : 'white',
                  border: 'none', borderRadius: '6px', padding: '0.75rem',
                  fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.05em', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  transition: 'all 0.2s'
                }}
              >
                {isLoading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                {isLoading ? 'Processing...' : 'Run Vertex AI Studio'}
              </button>
            </div>
            
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
