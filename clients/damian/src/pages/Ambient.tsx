import { useState, useRef, useEffect } from 'react';

interface LocalTrack {
  id: string;
  title: string;
  blob: Blob;
  url: string;
}

// --- IndexedDB Cache ---
const DB_NAME = 'damian_ambient';
const STORE_NAME = 'tracks';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME, { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToDB(id: string, title: string, blob: Blob) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put({ id, title, blob });
  return new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
}

async function loadAllFromDB(): Promise<{ id: string; title: string; blob: Blob }[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });
}

async function deleteFromDB(id: string) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
}

// --- YouTube Search (commented out for now) ---
// To enable: install a library like youtube-sr or use invidious API
// async function searchYouTube(query: string): Promise<{title: string, videoId: string}[]> {
//   const res = await fetch(`https://inv.nadeko.net/api/v1/search?q=${encodeURIComponent(query + ' ambient music')}&type=video`);
//   const data = await res.json();
//   return data.slice(0, 3).map((v: any) => ({ title: v.title, videoId: v.videoId }));
// }
// To download audio from YouTube without ads, you'd use a server-side solution (yt-dlp)
// For now, local files are the ad-free solution

export default function Ambient() {
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<LocalTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [loop, setLoop] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load cached tracks on mount
  useEffect(() => {
    loadAllFromDB().then(cached => {
      const loaded = cached.map(t => ({
        id: t.id,
        title: t.title,
        blob: t.blob,
        url: URL.createObjectURL(t.blob),
      }));
      setTracks(loaded);
    });
    return () => { tracks.forEach(t => URL.revokeObjectURL(t.url)); };
  }, []);

  // Sync audio element with state
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    audioRef.current.loop = loop;
  }, [volume, loop]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('audio/')) continue;
      const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const title = file.name.replace(/\.[^.]+$/, '');
      await saveToDB(id, title, file);
      const url = URL.createObjectURL(file);
      setTracks(prev => [...prev, { id, title, blob: file, url }]);
    }
    e.target.value = '';
  };

  const play = (track: LocalTrack) => {
    setActiveTrack(track);
    setIsPlaying(true);
    setTimeout(() => { audioRef.current?.play(); }, 50);
  };

  const togglePlay = () => {
    if (!audioRef.current || !activeTrack) return;
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const removeTrack = async (id: string) => {
    if (activeTrack?.id === id) {
      audioRef.current?.pause();
      setActiveTrack(null);
      setIsPlaying(false);
    }
    await deleteFromDB(id);
    setTracks(prev => {
      const t = prev.find(x => x.id === id);
      if (t) URL.revokeObjectURL(t.url);
      return prev.filter(x => x.id !== id);
    });
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '32px' }}>
        <div>
          <h1>Musica Ambiente</h1>
          <p className="subtitle">Archivos de audio locales, sin publicidad. Se guardan en cache para reproduccion rapida.</p>
        </div>
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
          + Agregar Audio
        </button>
        <input ref={fileInputRef} type="file" accept="audio/*" multiple hidden onChange={handleFileSelect} />
      </div>

      {/* Player activo */}
      {activeTrack && (
        <div className="card" style={{ marginBottom: '24px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: isPlaying ? 'var(--success-color, #22c55e)' : '#aaa', animation: isPlaying ? 'pulse 2s infinite' : 'none' }} />
            <span style={{ fontWeight: 600, flex: 1 }}>{isPlaying ? 'Reproduciendo' : 'Pausado'}: {activeTrack.title}</span>
            <button className="btn" style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }} onClick={togglePlay}>
              {isPlaying ? 'Pausar' : 'Play'}
            </button>
            <button className="btn" style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }} onClick={() => setLoop(!loop)}>
              Loop: {loop ? 'ON' : 'OFF'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', width: '60px' }}>Volumen</span>
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ flex: 1 }} />
            <span style={{ fontSize: '13px', width: '40px', textAlign: 'right' }}>{Math.round(volume * 100)}%</span>
          </div>
          <audio
            ref={audioRef}
            src={activeTrack.url}
            loop={loop}
            onEnded={() => setIsPlaying(false)}
          />
        </div>
      )}

      {/* Lista de tracks */}
      {tracks.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#9835;</div>
          <h3 style={{ margin: '0 0 8px' }}>Sin audio cargado</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Hace click en "Agregar Audio" para subir archivos MP3, WAV, OGG, etc.</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>Los archivos se guardan en cache del navegador para uso rapido.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2" style={{ gap: '20px' }}>
          {tracks.map(track => (
            <div
              key={track.id}
              className="card"
              style={{
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: activeTrack?.id === track.id ? '2px solid var(--primary-color)' : undefined,
              }}
              onClick={() => play(track)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '12px',
                  background: activeTrack?.id === track.id ? 'var(--primary-color, #6366f1)' : 'var(--surface-secondary, #f3f4f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', flexShrink: 0,
                  color: activeTrack?.id === track.id ? 'white' : 'var(--text-secondary)',
                }}>
                  {activeTrack?.id === track.id && isPlaying ? '♫' : '▶'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Audio local (cacheado)</div>
                </div>
                <button
                  className="btn"
                  style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', flexShrink: 0 }}
                  onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
