'use client';

import { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, Navigation, Wind } from 'lucide-react';

export default function WeatherWidget({ location }: { location: string }) {
  const [weather, setWeather] = useState<any>(null);
  const [error, setError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    async function fetchWeather() {
      if (!location) return;
      try {
        const cityName = location.split(',')[0].trim();
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        
        if (!geoData.results || geoData.results.length === 0) {
          setError(true);
          return;
        }
        
        const { latitude, longitude } = geoData.results[0];
        
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`);
        const weatherData = await weatherRes.json();
        
        if (weatherData.current && weatherData.daily) {
          setWeather(weatherData);
        }
      } catch (e) {
        setError(true);
      }
    }
    fetchWeather();
  }, [location]);

  if (error) return null;

  if (!weather) {
    return (
      <div 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          width: '76px',
          height: '29px',
          background: 'rgba(255,255,255,0.08)', 
          borderRadius: '2rem', 
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'pulse-weather 1.5s infinite ease-in-out'
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulse-weather {
            0% { opacity: 0.6; }
            50% { opacity: 0.3; }
            100% { opacity: 0.6; }
          }
        `}} />
      </div>
    );
  }

  const getWeatherIcon = (code: number, size = 18) => {
    if (code === 0 || code === 1) return <Sun size={size} />;
    if (code === 2 || code === 3) return <Cloud size={size} />;
    if (code === 45 || code === 48) return <CloudFog size={size} />;
    if (code >= 51 && code <= 67) return <CloudRain size={size} />;
    if (code >= 71 && code <= 77) return <Snowflake size={size} />;
    if (code >= 80 && code <= 82) return <CloudRain size={size} />;
    if (code >= 95 && code <= 99) return <CloudLightning size={size} />;
    return <Cloud size={size} />;
  };

  const currentTemp = Math.round(weather.current.temperature_2m);
  const currentCode = weather.current.weather_code;

  return (
    <div 
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        title={`Current weather in ${location}`}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          color: 'white', 
          fontSize: '0.85rem', 
          fontWeight: 600, 
          padding: '0.4rem 0.75rem', 
          background: isHovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)', 
          borderRadius: '2rem', 
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'default',
          transition: 'all 0.2s'
        }}
      >
        {getWeatherIcon(currentCode)}
        {currentTemp}°F
      </div>

      {isHovered && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.5rem)',
          right: 0,
          background: 'var(--color-surface, #171717)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          minWidth: '220px',
          color: 'var(--color-foreground, white)',
          fontSize: '0.85rem'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            5-Day Forecast
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {weather.daily.time.slice(0, 5).map((dateStr: string, idx: number) => {
              const date = new Date(dateStr + 'T00:00:00');
              const dayName = idx === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
              const minT = Math.round(weather.daily.temperature_2m_min[idx]);
              const maxT = Math.round(weather.daily.temperature_2m_max[idx]);
              const windSpeed = Math.round(weather.daily.wind_speed_10m_max[idx]);
              const windDir = weather.daily.wind_direction_10m_dominant[idx];
              const code = weather.daily.weather_code[idx];

              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: idx < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ width: '45px', fontWeight: 500 }}>{dayName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '30px' }}>
                    {getWeatherIcon(code, 16)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', width: '50px', justifyContent: 'flex-end', fontSize: '0.8rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{minT}°</span>
                    <span style={{ fontWeight: 600 }}>{maxT}°</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', width: '60px', justifyContent: 'flex-end', color: 'var(--color-muted)' }} title={`Wind: ${windSpeed} mph`}>
                    <span style={{ fontSize: '0.75rem' }}>{windSpeed}</span>
                    <Navigation size={12} style={{ transform: `rotate(${windDir}deg)`, opacity: 0.8 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
