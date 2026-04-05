import { useState } from 'react';

interface Track {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
}

const TRACKS: Track[] = [
  { id: '1', title: 'Spa & Relajacion', description: 'Musica suave para sesiones de masaje relajante', youtubeId: 'lFcSrYw-ARY' },
  { id: '2', title: 'Naturaleza y Agua', description: 'Sonidos de agua y naturaleza para drenaje linfatico', youtubeId: 'eKFTSSKCzWA' },
  { id: '3', title: 'Piano Tranquilo', description: 'Piano instrumental para ambiente calmo', youtubeId: '77ZozI0rw7w' },
  { id: '4', title: 'Cuencos Tibetanos', description: 'Vibraciones profundas para sesiones descontracturantes', youtubeId: 'gJakaRqSdJM' },
];

export default function Ambient() {
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '32px' }}>
        <div>
          <h1>Musica Ambiente</h1>
          <p className="subtitle">Selecciona la musica de fondo para tus sesiones. Se reproduce directo en tu dispositivo.</p>
        </div>
        {activeTrack && (
          <button
            className="btn"
            style={{ padding: '8px 16px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}
            onClick={() => setActiveTrack(null)}
          >
            Detener Musica
          </button>
        )}
      </div>

      {/* Player activo */}
      {activeTrack && (
        <div className="card" style={{ marginBottom: '32px', overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success-color)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontWeight: 600 }}>Reproduciendo: {activeTrack.title}</span>
          </div>
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src={`https://www.youtube.com/embed/${activeTrack.youtubeId}?autoplay=1&loop=1&playlist=${activeTrack.youtubeId}`}
              title={activeTrack.title}
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>
      )}

      {/* Lista de tracks */}
      <div className="grid grid-cols-2" style={{ gap: '20px' }}>
        {TRACKS.map(track => (
          <div
            key={track.id}
            className="card"
            style={{
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              border: activeTrack?.id === track.id ? '2px solid var(--primary-color)' : undefined,
            }}
            onClick={() => setActiveTrack(track)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '12px',
                background: activeTrack?.id === track.id ? 'var(--primary-color)' : 'var(--surface-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', flexShrink: 0,
                color: activeTrack?.id === track.id ? 'white' : 'var(--text-secondary)',
              }}>
                {activeTrack?.id === track.id ? '♫' : '▶'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{track.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{track.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
