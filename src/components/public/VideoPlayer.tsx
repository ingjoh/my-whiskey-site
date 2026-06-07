'use client';

import React, { useRef, useEffect, useState, useId } from 'react';

export interface VideoPlayerProps {
  url?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  startTime?: number;
  endTime?: number | null;
  playbackSpeed?: number;
  objectFit?: 'cover' | 'contain';
  overlayOpacity?: number;
  showControls?: boolean;
}

export default function VideoPlayer({
  url = '',
  autoPlay = false,
  muted = true,
  loop = false,
  startTime = 0,
  endTime = null,
  playbackSpeed = 1.0,
  objectFit = 'contain',
  overlayOpacity = 0,
  showControls = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  const numStart = startTime ? parseFloat(String(startTime)) : 0;
  const numEnd = endTime ? parseFloat(String(endTime)) : null;

  let embedUrl = url;
  let isDirect = false;
  let isYoutube = false;

  const ytMatch = url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  const vimeoMatch = url?.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i);

  const reactId = useId();
  const playerId = `yt_${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

  if (ytMatch) {
    isYoutube = true;
    let params = `autoplay=${autoPlay ? 1 : 0}&mute=${muted ? 1 : 0}&playsinline=1&rel=0&enablejsapi=1&controls=${showControls ? 1 : 0}&id=${playerId}`;
    if (numStart) params += `&start=${numStart}`;
    if (numEnd) params += `&end=${numEnd}`;
    if (loop) params += `&loop=1&playlist=${ytMatch[1]}`;
    
    embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?${params}`;
  } else if (vimeoMatch) {
    let params = `autoplay=${autoPlay ? 1 : 0}&muted=${muted ? 1 : 0}&playsinline=1&title=0&byline=0&portrait=0`;
    if (numStart) params += `#t=${numStart}s`;
    embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}?${params}`;
  } else if (url) {
    isDirect = true;
  }

  useEffect(() => {
    let animationFrameId: number;

    // HTML5 Video Logic
    const video = videoRef.current;
    if (isDirect && video) {
      video.playbackRate = playbackSpeed;

      const checkTime = () => {
        const current = video.currentTime;
        if (numEnd !== null && numEnd > numStart && current >= numEnd) {
          if (loop) {
            video.currentTime = numStart;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        } else if (numStart > 0 && current < numStart - 0.5) {
            // Failsafe if it somehow jumps before start
            video.currentTime = numStart;
        }
        animationFrameId = requestAnimationFrame(checkTime);
      };

      const handleLoadedMetadata = () => {
        video.playbackRate = playbackSpeed;
        if (numStart > 0 && Math.abs(video.currentTime - numStart) > 1) {
          video.currentTime = numStart;
        }
      };

      const handleEnded = () => {
        if (loop) {
          video.currentTime = numStart;
          video.play().catch(() => {});
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('ended', handleEnded);

      if (video.readyState >= 1) {
        video.playbackRate = playbackSpeed;
      }

      animationFrameId = requestAnimationFrame(checkTime);

      return () => {
        cancelAnimationFrame(animationFrameId);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('ended', handleEnded);
      };
    }

    // YouTube API Interceptor Logic
    if (isYoutube) {
      const handleMessage = (event: MessageEvent) => {
        if (!event.origin.includes('youtube.com')) return;
        try {
          const iframe = iframeRef.current;
          if (!iframe || !iframe.contentWindow) return;
          if (event.source !== iframe.contentWindow) return;

          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

          // Info Delivery (gives us current time)
          if (data.event === 'infoDelivery' && data.info) {
            const current = data.info.currentTime;
            if (current !== undefined && numEnd !== null && current >= numEnd) {
              if (loop) {
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [numStart, true] }), '*');
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo' }), '*');
              } else {
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo' }), '*');
              }
            }
          }
          
          // State Change (0 = Ended, 1 = Playing, 2 = Paused)
          if (data.event === 'onStateChange' || data.event === 'initialDelivery') {
            // Apply playback speed
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [playbackSpeed] }), '*');
            
            // If ended (0) or paused (2) at the end, and we need to loop
            if ((data.info === 0 || data.info === 2) && loop) {
                // If it's paused, we only loop if we don't have a numEnd (meaning it reached the end of the video)
                // OR if we DO have a numEnd and it reached it (handled by infoDelivery usually, but as a fallback)
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [numStart, true] }), '*');
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo' }), '*');
            }
          }
        } catch (e) {}
      };

      window.addEventListener('message', handleMessage);
      
      // Request active info delivery to get currentTime updates
      if (iframeRef.current && iframeRef.current.contentWindow) {
         iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
      }

      return () => window.removeEventListener('message', handleMessage);
    }
  }, [embedUrl, isDirect, isYoutube, numStart, numEnd, loop, playbackSpeed]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
    if (iframeRef.current && iframeRef.current.contentWindow && isYoutube) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [playbackSpeed] }), '*');
    }
  }, [playbackSpeed, isYoutube]);

  if (!url) {
    return (
      <div style={{ width: '100%', padding: '4rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', background: 'rgba(0,0,0,0.1)' }}>
        Enter a video URL
      </div>
    );
  }

  const iframeStyle: React.CSSProperties = objectFit === 'cover' 
    ? { position: 'absolute', top: '50%', left: '50%', width: '150%', height: '150%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', border: 'none' }
    : { width: '100%', height: '100%', border: 'none', display: 'block' };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {overlayOpacity > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${overlayOpacity})`, zIndex: 1, pointerEvents: 'none' }} />
      )}

      {isDirect ? (
        <video 
          ref={videoRef}
          src={embedUrl} 
          autoPlay={autoPlay} 
          muted={muted} 
          loop={loop && numStart === 0 && !numEnd} // Use native loop if no start/end specified
          controls={!autoPlay} 
          style={{ width: '100%', height: '100%', display: 'block', objectFit: objectFit, zIndex: 0 }} 
        />
      ) : (
        <iframe 
          ref={iframeRef}
          src={embedUrl} 
          allow="autoplay; fullscreen" 
          style={iframeStyle} 
        />
      )}
    </div>
  );
}
