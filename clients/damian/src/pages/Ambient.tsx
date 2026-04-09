import { useState, useRef, useEffect, useCallback } from 'react';
import { useMusicCommand } from '../components/MusicContext';

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

// --- Demo tracks (Mixkit free license - royalty free) ---
const DEMO_TRACKS = [
  { id: 'demo-valley-sunset', title: 'Valley Sunset — Relajante', url: 'https://assets.mixkit.co/music/127/127.mp3' },
  { id: 'demo-spirit-woods', title: 'Spirit in the Woods — Ambiente', url: 'https://assets.mixkit.co/music/139/139.mp3' },
  { id: 'demo-forest-treasure', title: 'Forest Treasure — Naturaleza', url: 'https://assets.mixkit.co/music/138/138.mp3' },
];

async function loadDemoTracksIfNeeded(): Promise<{ id: string; title: string; blob: Blob }[]> {
  const existing = await loadAllFromDB();
  if (existing.length > 0) return [];

  const loaded: { id: string; title: string; blob: Blob }[] = [];
  for (const demo of DEMO_TRACKS) {
    try {
      const res = await fetch(demo.url);
      if (!res.ok) continue;
      const blob = await res.blob();
      await saveToDB(demo.id, demo.title, blob);
      loaded.push({ id: demo.id, title: demo.title, blob });
    } catch {
      // Skip track if fetch fails
    }
  }
  return loaded;
}

// --- Icons ---
const PlayIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const PauseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const NextIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4"></polygon>
    <line x1="19" y1="5" x2="19" y2="19"></line>
  </svg>
);

const LoopIcon = ({ active, size = 18 }: { active: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: active ? 1 : 0.4 }}>
    <polyline points="17 1 21 5 17 9"></polyline>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
    <polyline points="7 23 3 19 7 15"></polyline>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
  </svg>
);

const ShuffleIcon = ({ active, size = 18 }: { active: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: active ? 1 : 0.4 }}>
    <polyline points="16 3 21 3 21 8"></polyline>
    <line x1="4" y1="20" x2="21" y2="3"></line>
    <polyline points="21 16 21 21 16 21"></polyline>
    <line x1="15" y1="15" x2="21" y2="21"></line>
    <line x1="4" y1="4" x2="9" y2="9"></line>
  </svg>
);

export default function Ambient() {
  const { lastCommand, setPlaybackState } = useMusicCommand();
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<LocalTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [loop, setLoop] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tracksRef = useRef<LocalTrack[]>([]);

  // Keep tracksRef in sync
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  // Sync playback state to MusicContext (for sidebar indicator)
  useEffect(() => {
    setPlaybackState(isPlaying, activeTrack?.title ?? null);
  }, [isPlaying, activeTrack, setPlaybackState]);

  const [loadingDemos, setLoadingDemos] = useState(false);

  // Load cached tracks on mount, download demos if first time
  useEffect(() => {
    (async () => {
      let cached = await loadAllFromDB();
      if (cached.length === 0) {
        setLoadingDemos(true);
        const demos = await loadDemoTracksIfNeeded();
        cached = demos;
        setLoadingDemos(false);
      }
      const loaded = cached.map(t => ({
        id: t.id,
        title: t.title,
        blob: t.blob,
        url: URL.createObjectURL(t.blob),
      }));
      setTracks(loaded);
    })();
    return () => { tracks.forEach(t => URL.revokeObjectURL(t.url)); };
  }, []);

  // Sync audio element with state
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    audioRef.current.loop = loop;
  }, [volume, loop]);

  const shuffleRef = useRef(false);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);

  const getNextTrack = useCallback((currentTracks: LocalTrack[], current: LocalTrack | null): LocalTrack | null => {
    if (currentTracks.length === 0) return null;
    if (currentTracks.length === 1) return currentTracks[0];
    if (shuffleRef.current) {
      const others = current ? currentTracks.filter(t => t.id !== current.id) : currentTracks;
      return others[Math.floor(Math.random() * others.length)];
    }
    const currentIdx = current ? currentTracks.findIndex(t => t.id === current.id) : -1;
    return currentTracks[(currentIdx + 1) % currentTracks.length];
  }, []);

  const playTrack = useCallback((track: LocalTrack) => {
    setActiveTrack(track);
    setIsPlaying(true);
    setTimeout(() => { audioRef.current?.play(); }, 50);
  }, []);

  // Listen for music commands from agent
  useEffect(() => {
    if (!lastCommand) return;
    const currentTracks = tracksRef.current;

    if (lastCommand.action === 'pause') {
      audioRef.current?.pause();
      setIsPlaying(false);
      setCommandFeedback('Musica pausada');
    } else if (lastCommand.action === 'play') {
      if (currentTracks.length === 0) {
        setCommandFeedback('No hay musica cargada — subi tracks en Musica Ambiente');
        return;
      }
      if (lastCommand.query) {
        const q = lastCommand.query.toLowerCase();
        const match = currentTracks.find(t => t.title.toLowerCase().includes(q));
        if (match) {
          playTrack(match);
          setCommandFeedback(`Reproduciendo: ${match.title}`);
        } else {
          setCommandFeedback(`No encontre "${lastCommand.query}" en tus tracks`);
        }
      } else {
        const track = activeTrack || currentTracks[0];
        if (track) {
          if (activeTrack && audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
          } else {
            playTrack(track);
          }
          setCommandFeedback(`Reproduciendo: ${track.title}`);
        }
      }
    } else if (lastCommand.action === 'next') {
      if (currentTracks.length === 0) {
        setCommandFeedback('No hay musica cargada');
        return;
      }
      const next = getNextTrack(currentTracks, activeTrack);
      if (next) {
        playTrack(next);
        setCommandFeedback(`Siguiente: ${next.title}`);
      }
    }

    const timer = setTimeout(() => setCommandFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [lastCommand]);

  const play = (track: LocalTrack) => playTrack(track);

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

  const togglePlay = () => {
    if (!audioRef.current || !activeTrack) return;
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    const currentTracks = tracksRef.current;
    if (currentTracks.length === 0) return;
    const next = getNextTrack(currentTracks, activeTrack);
    if (next) playTrack(next);
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

      {/* Command feedback from agent */}
      {commandFeedback && (
        <div className="card" style={{ marginBottom: '16px', padding: '12px 20px', backgroundColor: 'var(--primary-color, #6366f1)', color: 'white', fontWeight: 600, fontSize: '14px' }}>
          Asistente IA: {commandFeedback}
        </div>
      )}

      {/* Player activo */}
      {activeTrack && (
        <div className="card" style={{ marginBottom: '24px', padding: '24px', borderLeft: '6px solid var(--primary-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Visualizer indicator */}
            <div style={{
              width: 64, height: 64, borderRadius: '16px',
              background: 'var(--surface-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden'
            }}>
              {isPlaying ? (
                <div className="flex" style={{ gap: '3px', alignItems: 'flex-end', height: '20px' }}>
                  <div style={{ width: 4, background: 'var(--primary-color)', animation: 'pulse 1s infinite 0s', borderRadius: '2px' }} />
                  <div style={{ width: 4, background: 'var(--primary-color)', animation: 'pulse 0.8s infinite 0.2s', borderRadius: '2px' }} />
                  <div style={{ width: 4, background: 'var(--primary-color)', animation: 'pulse 1.2s infinite 0.4s', borderRadius: '2px' }} />
                </div>
              ) : (
                <PauseIcon size={24} />
              )}
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                {isPlaying ? 'Reproduciendo ahora' : 'En pausa'}
              </div>
              <div style={{ fontWeight: 800, fontSize: '20px', color: 'var(--text-primary)' }}>{activeTrack.title}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                className="btn-icon"
                onClick={() => setShuffle(!shuffle)}
                title="Mezclar"
                aria-label="Mezclar"
                style={{ color: shuffle ? 'var(--primary-color)' : 'var(--text-secondary)' }}
              >
                <ShuffleIcon active={shuffle} />
              </button>
              <button
                className="btn-icon"
                onClick={() => setLoop(!loop)}
                title="Repetir"
                aria-label="Repetir"
                style={{ color: loop ? 'var(--primary-color)' : 'var(--text-secondary)' }}
              >
                <LoopIcon active={loop} />
              </button>

              <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }} />

              <button
                className="btn-primary"
                style={{ width: 48, height: 48, padding: 0, borderRadius: '50%' }}
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
              </button>

              <button
                className="btn"
                style={{ width: 40, height: 40, padding: 0, borderRadius: '50%', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}
                onClick={handleNext}
                title="Siguiente"
                aria-label="Siguiente"
              >
                <NextIcon size={18} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px', padding: '12px 16px', background: 'var(--surface-secondary)', borderRadius: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, width: '60px' }}>VOLUMEN</span>
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--primary-color)' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, width: '40px', textAlign: 'right', color: 'var(--primary-color)' }}>{Math.round(volume * 100)}%</span>
          </div>
          <audio
            ref={audioRef}
            src={activeTrack.url}
            loop={loop}
            onEnded={() => {
              if (!loop && tracksRef.current.length > 1) {
                const next = getNextTrack(tracksRef.current, activeTrack);
                if (next) { playTrack(next); return; }
              }
              setIsPlaying(false);
            }}
          />
        </div>
      )}

      {/* Lista de tracks */}
      {tracks.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#9835;</div>
          {loadingDemos ? (
            <>
              <h3 style={{ margin: '0 0 8px' }}>Descargando musica relajante...</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Preparando 3 tracks de ambiente para tu consultorio. Solo la primera vez.</p>
            </>
          ) : (
            <>
              <h3 style={{ margin: '0 0 8px' }}>Sin audio cargado</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Hace click en "Agregar Audio" para subir archivos MP3, WAV, OGG, etc.</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>Los archivos se guardan en cache del navegador para uso rapido.</p>
            </>
          )}
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
                  {activeTrack?.id === track.id ? (
                    isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />
                  ) : <PlayIcon size={24} />}
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

    </div>
  );
}
