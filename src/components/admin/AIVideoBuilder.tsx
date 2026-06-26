'use client';

import React, { useState } from 'react';
import { Sparkles, Video, Play, Music, FileText, Check, X, ShieldAlert, UploadCloud, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface AIVideoBuilderProps {
  onClose: () => void;
  onSelectVideo: (url: string) => void;
  initialCampaignName?: string;
  contextText?: string;
}

export default function AIVideoBuilder({ onClose, onSelectVideo, initialCampaignName, contextText }: AIVideoBuilderProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [campaignName, setCampaignName] = useState(initialCampaignName || '');
  const [sourceVideoUrl, setSourceVideoUrl] = useState('');
  const [instruction, setInstruction] = useState(contextText || '');

  // Pipeline simulation stages
  const [pipelineStage, setPipelineStage] = useState<number>(0);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);

  // Results State
  const [result, setResult] = useState<{
    sourceVideoUrl: string;
    narrationAudioUrl: string;
    overlaysJsonUrl: string;
    bakedVideoUrl: string;
    narrationScript: string;
    overlays: Array<{
      text: string;
      start: number;
      end: number;
      position: { x: number; y: number };
      fontSize: number;
    }>;
  } | null>(null);

  // Handle local video clip upload to simulate ingestion
  const handleUploadClick = () => {
    // In local demo, we let them enter a public sample video or upload an asset.
    // We will provide a luxury sample video URL as default.
    setSourceVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-luxury-yacht-at-sunset-running-in-sea-43093-large.mp4');
  };

  // Run pipeline
  const handleStartPipeline = async () => {
    if (!sourceVideoUrl) {
      setErrorMsg('Please select or specify a source video clip.');
      return;
    }
    if (!campaignName.trim()) {
      setErrorMsg('Please specify a Campaign Name.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);
    setPipelineStage(1);
    setPipelineLogs(['[INFO] Initializing video synthesis pipeline...', '[INFO] Connecting to Vertex AI engine...']);

    // Phase 1 timer simulation
    setTimeout(() => {
      setPipelineStage(2);
      setPipelineLogs(prev => [
        ...prev,
        '[AI] Scripting complete. Narration script generated.',
        '[AI] Subtitle placement coordinates mapped in 1080p canvas space.'
      ]);
    }, 2000);

    // Phase 2 timer simulation
    setTimeout(() => {
      setPipelineStage(3);
      setPipelineLogs(prev => [
        ...prev,
        '[AUDIO] Synthesizing voiceover narration with Google Text-to-Speech...',
        '[AUDIO] Narration audio track generated and encoded as narration.mp3.'
      ]);
    }, 4500);

    // Phase 3 timer simulation
    setTimeout(() => {
      setPipelineStage(4);
      setPipelineLogs(prev => [
        ...prev,
        '[CLOUD RUN] Initializing FFmpeg video rendering container...',
        '[FFMPEG] Burning vector text overlays at exact coordinates...',
        '[FFMPEG] Merging voiceover track and source video clip...'
      ]);
    }, 7000);

    try {
      const idToken = user ? await user.getIdToken() : '';
      
      const response = await fetch('/api/admin/ai/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          sourceVideoUrl,
          campaignName,
          prompt: instruction
        })
      });

      // Bounded wait to finish simulation look
      await new Promise(resolve => setTimeout(resolve, 9000));

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Server error occurred during video rendering.');
      }

      const data = await response.json();
      setPipelineStage(5);
      setPipelineLogs(prev => [
        ...prev,
        '[STORAGE] Raw components saved to GCP bucket folder successfully.',
        '[SUCCESS] Ad video baked and finalized: baked.mp4.'
      ]);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Video pipeline compilation failed.');
      setPipelineStage(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(5,5,5,0.94)', backdropFilter: 'blur(8px)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: '#ededed'
    }}>
      <div style={{
        background: '#0d0e10', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', width: '90%', maxWidth: '980px', height: '82vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
      }}>
        
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Video size={20} color="#d97706" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', fontFamily: "var(--font-heading)" }}>
              AI Video Creative Studio &amp; Overlay Compiler
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body split */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* Left Panel: Video Workspace / Results */}
          <div style={{
            flex: 1.2, padding: '2rem', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: '#070708',
            borderRight: '1px solid rgba(255,255,255,0.06)', position: 'relative'
          }}>
            {pipelineStage === 0 && !result && (
              <div style={{ textAlign: 'center', maxWidth: '360px', opacity: 0.65 }}>
                <Video size={48} style={{ margin: '0 auto 1.25rem', color: '#d97706' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>Automated Video Generation</h4>
                <p style={{ fontSize: '0.8rem', lineHeight: '1.5' }}>
                  Provide a source video clip and a narration prompt. Gemini will compose a voiceover script, align subtitles in overlay coordinate grids, and bake a finished video.
                </p>
              </div>
            )}

            {/* Pipeline Stage Tracker */}
            {isLoading && (
              <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                    <span style={{ color: '#D8C7AF' }}>Ad Compiling Progress</span>
                    <span style={{ color: '#d97706' }}>{Math.min(100, pipelineStage * 25)}%</span>
                  </div>
                  <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pipelineStage * 25}%`, background: '#d97706', transition: 'width 0.4s ease-out' }} />
                  </div>
                </div>

                <div style={{ background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.75rem', height: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                  {pipelineLogs.map((log, idx) => (
                    <div key={idx} style={{
                      color: log.includes('[SUCCESS]') ? '#4ade80' : log.includes('[AI]') ? '#38bdf8' : log.includes('[AUDIO]') ? '#e9d5ff' : 'rgba(255,255,255,0.5)'
                    }}>
                      {log}
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#d97706', marginTop: '0.25rem' }}>
                    <RefreshCw size={10} className="animate-spin" />
                    <span>Processing next pipeline stage...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pipeline result preview */}
            {!isLoading && result && (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: '1.5rem', paddingRight: '0.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, fontFamily: "var(--font-heading)" }}>
                  Ad Campaign Compiled Assets
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                  {/* Video Player */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>Baked Video (Narration + Subtitles)</span>
                    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden', background: '#000' }}>
                      <video src={result.bakedVideoUrl} controls style={{ width: '100%', display: 'block', maxHeight: '220px' }} />
                    </div>
                  </div>

                  {/* Components details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>Preserved Components</span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <a href={result.sourceVideoUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: '#121417', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '0.5rem', fontSize: '0.72rem', color: '#ededed', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Video size={14} color="#B9783B" />
                        <span>Source Clip (source.mp4)</span>
                      </a>
                      <a href={result.narrationAudioUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: '#121417', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '0.5rem', fontSize: '0.72rem', color: '#ededed', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Music size={14} color="#a855f7" />
                        <span>Narration Voice (narration.mp3)</span>
                      </a>
                      <a href={result.overlaysJsonUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: '#121417', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '0.5rem', fontSize: '0.72rem', color: '#ededed', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={14} color="#0ea5e9" />
                        <span>Overlays Coordinates (overlays.json)</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Subtitles Overlay coordinates detail */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>Subtitles Coordinate Map</span>
                  <div style={{ background: '#101114', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <th style={{ padding: '0.5rem' }}>Overlay Text</th>
                          <th style={{ padding: '0.5rem' }}>Timeline</th>
                          <th style={{ padding: '0.5rem' }}>Canvas (X, Y)</th>
                          <th style={{ padding: '0.5rem' }}>Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.overlays?.map((ov, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: 600, color: 'white' }}>"{ov.text}"</td>
                            <td style={{ padding: '0.5rem', color: '#708C84' }}>{ov.start}s - {ov.end}s</td>
                            <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>({ov.position.x.toFixed(2)}, {ov.position.y.toFixed(2)})</td>
                            <td style={{ padding: '0.5rem' }}>{ov.fontSize || 24}px</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Configurations controls */}
          <div style={{
            width: '340px', padding: '1.5rem', background: '#101114',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Campaign Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Summer Sunset Yacht Promo"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  disabled={isLoading || !!result}
                  style={{
                    background: '#16181b', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA',
                    outline: 'none', fontSize: '0.825rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>
                  Source Video Clip
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    placeholder="URL of video asset (.mp4)..."
                    value={sourceVideoUrl}
                    onChange={(e) => setSourceVideoUrl(e.target.value)}
                    disabled={isLoading || !!result}
                    style={{
                      flex: 1, background: '#16181b', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA',
                      outline: 'none', fontSize: '0.8rem'
                    }}
                  />
                  {!result && (
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      disabled={isLoading}
                      style={{
                        background: 'rgba(255,255,255,0.05)', color: '#D8C7AF',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
                        padding: '0.6rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Use Demo Clip
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Overlay &amp; Voiceover Instructions
                </label>
                <textarea
                  placeholder="e.g. 'Use a luxury narrative tone. Burn subtitle captions at the bottom center. Emphasize Crab Island sandbar excursions.'"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  disabled={isLoading || !!result}
                  rows={4}
                  style={{
                    background: '#16181b', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA',
                    outline: 'none', resize: 'none', fontSize: '0.8rem', lineHeight: '1.4'
                  }}
                />
              </div>

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

            {/* Bottom Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
              {result && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectVideo(result.bakedVideoUrl);
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
                  Bind Video to Ad
                </button>
              )}

              {result && (
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setPipelineStage(0);
                    setSourceVideoUrl('');
                  }}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)', borderRadius: '6px', padding: '0.65rem',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  Compile Another Video
                </button>
              )}

              {!result && (
                <button
                  type="button"
                  onClick={handleStartPipeline}
                  disabled={isLoading || !sourceVideoUrl || !campaignName.trim()}
                  style={{
                    background: isLoading || !sourceVideoUrl || !campaignName.trim() ? 'rgba(255,255,255,0.05)' : '#d97706',
                    color: isLoading || !sourceVideoUrl || !campaignName.trim() ? 'rgba(255,255,255,0.3)' : 'white',
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
                  {isLoading ? 'Baking Video...' : 'Compile Ad Video'}
                </button>
              )}
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
