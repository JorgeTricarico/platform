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
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const PrevIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="19 20 9 12 19 4 19 20"></polygon>
    <line x1="5" y1="19" x2="5" y2="5"></line>
  </svg>
);

const NextIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4"></polygon>
    <line x1="19" y1="5" x2="19" y2="19"></line>
  </svg>
);

const LoopIcon = ({ active, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? 'var(--primary-color)' : 'currentColor', opacity: active ? 1 : 0.5 }}>
    <polyline points="17 1 21 5 17 9"></polyline>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
    <polyline points="7 23 3 19 7 15"></polyline>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
  </svg>
);

const ShuffleIcon = ({ active, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? 'var(--primary-color)' : 'currentColor', opacity: active ? 1 : 0.5 }}>
    <polyline points="16 3 21 3 21 8"></polyline>
    <line x1="4" y1="20" x2="21" y2="3"></line>
    <polyline points="21 16 21 21 16 21"></polyline>
    <line x1="15" y1="15" x2="21" y2="21"></line>
    <line x1="4" y1="4" x2="9" y2="9"></line>
  </svg>
);

const MusicIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  const handlePrev = () => {
    const currentTracks = tracksRef.current;
    if (currentTracks.length === 0 || !activeTrack) return;
    const currentIdx = currentTracks.findIndex(t => t.id === activeTrack.id);
    const prevIdx = (currentIdx - 1 + currentTracks.length) % currentTracks.length;
    playTrack(currentTracks[prevIdx]);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = Number(e.target.value);
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
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
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="flex-between" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ marginBottom: '8px' }}>Música Ambiente</h1>
          <p className="subtitle" style={{ margin: 0 }}>Gestión de audio local para tu consultorio.</p>
        </div>
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} style={{ borderRadius: '12px' }}>
          + Agregar Audio
        </button>
        <input ref={fileInputRef} type="file" accept="audio/*" multiple hidden onChange={handleFileSelect} />
      </div>

      {/* Player Premium */}
      <div className={`card glass-card ${activeTrack ? '' : 'disabled'}`} style={{ 
        marginBottom: '40px', 
        padding: '40px', 
        borderRadius: '32px',
        opacity: activeTrack ? 1 : 0.6,
        pointerEvents: activeTrack ? 'all' : 'none',
        transition: 'all 0.5s ease',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {/* Album Art / Icon */}
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '30px', 
            background: 'var(--primary-color)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: '0 12px 24px rgba(99, 102, 241, 0.3)',
            position: 'relative'
          }}>
            <MusicIcon size={48} />
            {isPlaying && (
              <div style={{ position: 'absolute', bottom: '-10px', display: 'flex', gap: '3px', alignItems: 'flex-end', height: '24px' }}>
                <div className="wave-bar" style={{ animationDelay: '0s' }} />
                <div className="wave-bar" style={{ animationDelay: '0.2s' }} />
                <div className="wave-bar" style={{ animationDelay: '0.4s' }} />
                <div className="wave-bar" style={{ animationDelay: '0.1s' }} />
              </div>
            )}
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 800 }}>{activeTrack?.title || 'Seleccionar un track'}</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              {isPlaying ? 'Reproduciendo' : 'En Pausa'} • {tracks.length} Audios
            </p>
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <input 
              type="range" 
              className="premium-slider" 
              min="0" 
              max={duration || 0} 
              value={currentTime} 
              onChange={onSeek}
            />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '40px' }}>
            <button className="btn-icon" onClick={() => setShuffle(!shuffle)} title="Mezclar">
              <ShuffleIcon active={shuffle} size={22} />
            </button>
            <button className="btn-icon" onClick={handlePrev} title="Anterior">
              <PrevIcon size={24} />
            </button>
            
            <button 
              className="btn-primary" 
              style={{ width: '72px', height: '72px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={togglePlay}
            >
              {isPlaying ? <PauseIcon size={32} /> : <PlayIcon size={32} />}
            </button>

            <button className="btn-icon" onClick={handleNext} title="Siguiente">
              <NextIcon size={24} />
            </button>
            <button className="btn-icon" onClick={() => setLoop(!loop)} title="Repetir">
              <LoopIcon active={loop} size={22} />
            </button>
          </div>

          {/* Volume */}
          <div style={{ width: '200px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', background: 'rgba(0,0,0,0.03)', borderRadius: '20px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <input 
              type="range" 
              className="premium-slider" 
              min="0" max="1" step="0.05" 
              value={volume} 
              onChange={(e) => setVolume(Number(e.target.value))} 
            />
          </div>
        </div>

        <audio
          ref={audioRef}
          src={activeTrack?.url}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => {
            if (!loop) handleNext();
            else if (audioRef.current) audioRef.current.play();
          }}
        />
      </div>

      {/* Grid de Tracks */}
      <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 800 }}>Tus Audios</h3>
      <div className="grid grid-cols-2" style={{ gap: '16px' }}>
        {tracks.map(track => (
          <div
            key={track.id}
            className={`card track-card ${activeTrack?.id === track.id ? 'active' : ''}`}
            style={{ padding: '16px', borderRadius: '20px', cursor: 'pointer' }}
            onClick={() => play(track)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '12px', 
                background: activeTrack?.id === track.id ? 'var(--primary-color)' : 'var(--surface-secondary)',
                color: activeTrack?.id === track.id ? 'white' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {activeTrack?.id === track.id && isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Audio Local</div>
              </div>
              <button 
                className="btn-icon" 
                style={{ color: '#ef4444', backgroundColor: 'transparent' }}
                onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        ))}

        {tracks.length === 0 && (
          <div className="card" style={{ gridColumn: 'span 2', padding: '40px', textAlign: 'center', borderRadius: '24px', border: '2px dashed var(--border-color)', background: 'transparent' }}>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No hay audios cargados. Subí algunos para empezar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
