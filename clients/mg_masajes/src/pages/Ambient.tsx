import { useState, useRef, useEffect, useCallback } from 'react';
import { useMusicCommand } from '../components/MusicContext';

interface LocalTrack {
  id: string;
  title: string;
  blob: Blob;
  url: string;
}

// --- IndexedDB Cache ---
const DB_NAME = 'mg_masajes_ambient';
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

const LoopIcon = ({ active, size = 18 }: { active: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? '#D66D26' : 'currentColor', opacity: active ? 1 : 0.5 }}>
    <polyline points="17 1 21 5 17 9"></polyline>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
    <polyline points="7 23 3 19 7 15"></polyline>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
  </svg>
);

const ShuffleIcon = ({ active, size = 18 }: { active: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? '#D66D26' : 'currentColor', opacity: active ? 1 : 0.5 }}>
    <polyline points="16 3 21 3 21 8"></polyline>
    <line x1="4" y1="20" x2="21" y2="3"></line>
    <polyline points="21 16 21 21 16 21"></polyline>
    <line x1="15" y1="15" x2="21" y2="21"></line>
    <line x1="4" y1="4" x2="9" y2="9"></line>
  </svg>
);

const MusicNoteIcon = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
);

const UploadIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const TrashIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"></path>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
  </svg>
);

const VolumeIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tracksRef = useRef<LocalTrack[]>([]);
  const objectUrlsRef = useRef<string[]>([]);

  // Keep tracksRef in sync
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  // Sync playback state to MusicContext (for sidebar indicator)
  useEffect(() => {
    setPlaybackState(isPlaying, activeTrack?.title ?? null);
  }, [isPlaying, activeTrack, setPlaybackState]);

  // Load cached tracks on mount, download demos if first time
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let cached = await loadAllFromDB();
      if (cached.length === 0) {
        const demos = await loadDemoTracksIfNeeded();
        cached = demos;
      }
      if (cancelled) return;
      const loaded = cached.map(t => {
        const url = URL.createObjectURL(t.blob);
        objectUrlsRef.current.push(url);
        return { id: t.id, title: t.title, blob: t.blob, url };
      });
      setTracks(loaded);
    })();
    return () => {
      cancelled = true;
      objectUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
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

  // BUG FIX: use 'canplay' event instead of setTimeout(50ms)
  const playTrack = useCallback((track: LocalTrack) => {
    setActiveTrack(track);
    setIsPlaying(true);
    const audio = audioRef.current;
    if (!audio) return;

    const onCanPlay = () => {
      audio.play().catch(() => { /* autoplay blocked */ });
      audio.removeEventListener('canplay', onCanPlay);
    };

    // If the src is already set to this track and ready, play immediately
    if (audio.src === track.url && audio.readyState >= 3) {
      audio.play().catch(() => {});
    } else {
      audio.addEventListener('canplay', onCanPlay);
    }
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
  }, [lastCommand, activeTrack, playTrack, getNextTrack]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('audio/')) continue;
      const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const title = file.name.replace(/\.[^.]+$/, '');
      await saveToDB(id, title, file);
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      setTracks(prev => [...prev, { id, title, blob: file, url }]);
    }
    e.target.value = '';
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (!activeTrack) {
      if (tracks.length > 0) {
        playTrack(tracks[0]);
      }
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [activeTrack, isPlaying, tracks, playTrack]);

  const handleNext = useCallback(() => {
    const currentTracks = tracksRef.current;
    if (currentTracks.length === 0) return;
    const next = getNextTrack(currentTracks, activeTrack);
    if (next) playTrack(next);
  }, [activeTrack, getNextTrack, playTrack]);

  const handlePrev = useCallback(() => {
    const currentTracks = tracksRef.current;
    if (currentTracks.length === 0 || !activeTrack) return;
    const currentIdx = currentTracks.findIndex(t => t.id === activeTrack.id);
    const prevIdx = (currentIdx - 1 + currentTracks.length) % currentTracks.length;
    playTrack(currentTracks[prevIdx]);
  }, [activeTrack, playTrack]);

  const formatTime = useCallback((time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const onTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  }, []);

  const onSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = Number(e.target.value);
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // BUG FIX: inline delete confirmation instead of window.confirm
  const handleDeleteClick = useCallback((e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    if (deleteConfirm === trackId) {
      // Already confirming — execute delete
      if (activeTrack?.id === trackId) {
        audioRef.current?.pause();
        setActiveTrack(null);
        setIsPlaying(false);
      }
      deleteFromDB(trackId);
      setTracks(prev => {
        const t = prev.find(x => x.id === trackId);
        if (t) URL.revokeObjectURL(t.url);
        return prev.filter(x => x.id !== trackId);
      });
      setDeleteConfirm(null);
    } else {
      // Start confirmation — auto-reset after 2s
      setDeleteConfirm(trackId);
      setTimeout(() => setDeleteConfirm(prev => prev === trackId ? null : prev), 2000);
    }
  }, [deleteConfirm, activeTrack]);

  const restoreDemos = useCallback(async () => {
    const currentIds = tracks.map(t => t.id);
    const missing = DEMO_TRACKS.filter(d => !currentIds.includes(d.id));

    if (missing.length === 0) return;

    setIsRestoring(true);
    const restored: LocalTrack[] = [];
    for (const demo of missing) {
      try {
        const res = await fetch(demo.url);
        if (!res.ok) continue;
        const blob = await res.blob();
        await saveToDB(demo.id, demo.title, blob);
        const url = URL.createObjectURL(blob);
        objectUrlsRef.current.push(url);
        restored.push({ id: demo.id, title: demo.title, blob, url });
      } catch (err) {
        console.error('Error restaurando demo:', err);
      }
    }
    setTracks(prev => [...prev, ...restored]);
    setIsRestoring(false);
  }, [tracks]);

  // BUG FIX: onEnded simplified — only advance when loop is off
  const onEnded = useCallback(() => {
    if (!loop) handleNext();
  }, [loop, handleNext]);

  const play = useCallback((track: LocalTrack) => playTrack(track), [playTrack]);

  // Track number helper
  const getTrackNumber = useCallback((trackId: string) => {
    const idx = tracks.findIndex(t => t.id === trackId);
    return idx >= 0 ? String(idx + 1).padStart(2, '0') : '--';
  }, [tracks]);

  // Progress percentage for the slider visual
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="ambient-page">
      {/* Header */}
      <div className="ambient-header">
        <div className="ambient-header-left">
          <h1 className="ambient-title">Música Ambiente</h1>
          <p className="ambient-subtitle">Reproductor de sala</p>
        </div>
        <button className="ambient-upload-btn" onClick={() => fileInputRef.current?.click()}>
          <UploadIcon size={16} />
          <span>+ Agregar Audio</span>
        </button>
        <input ref={fileInputRef} type="file" accept="audio/*" multiple hidden onChange={handleFileSelect} />
      </div>

      <div className="ambient-layout">
        {/* LEFT: Dark player panel */}
        <div className="ambient-player-panel">
          {/* Artwork */}
          <div className={`ambient-artwork ${isPlaying ? 'ambient-artwork-playing' : ''}`}>
            <div className="ambient-artwork-inner">
              <MusicNoteIcon size={48} />
            </div>
            {isPlaying && (
              <>
                <div className="ambient-artwork-ring ambient-artwork-ring-1"></div>
                <div className="ambient-artwork-ring ambient-artwork-ring-2"></div>
                <div className="ambient-artwork-ring ambient-artwork-ring-3"></div>
              </>
            )}
          </div>

          {/* Track info */}
          <div className="ambient-now-playing-info">
            <h2 className="ambient-now-playing-title">
              {activeTrack?.title || 'Sin seleccion'}
            </h2>
            <p className="ambient-now-playing-label">
              {isPlaying ? 'Reproduciendo' : activeTrack ? 'En pausa' : 'Esperando'}
            </p>
          </div>

          {/* Wave bars */}
          {isPlaying && (
            <div className="ambient-wave-bars">
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  className="ambient-wave-bar"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="ambient-controls">
            <button className="ambient-ctrl-btn" onClick={handlePrev} title="Anterior">
              <PrevIcon size={18} />
            </button>

            <button className="ambient-play-btn" onClick={togglePlay}>
              {isPlaying ? <PauseIcon size={28} /> : <PlayIcon size={28} />}
            </button>

            <button className="ambient-ctrl-btn" onClick={handleNext} title="Siguiente">
              <NextIcon size={18} />
            </button>
          </div>

          {/* Progress */}
          <div className="ambient-progress">
            <div className="ambient-progress-bar-wrap">
              <div className="ambient-progress-bar-bg">
                <div
                  className="ambient-progress-bar-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <input
                type="range"
                className="ambient-progress-input"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={onSeek}
              />
            </div>
            <div className="ambient-time-row">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume + modes */}
          <div className="ambient-bottom-controls">
            <div className="ambient-volume-row">
              <VolumeIcon size={14} />
              <input
                type="range"
                className="ambient-volume-slider"
                min="0" max="1" step="0.05"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </div>
            <div className="ambient-mode-btns">
              <button className="ambient-mode-btn" onClick={() => setShuffle(!shuffle)} title="Mezclar">
                <ShuffleIcon active={shuffle} size={16} />
              </button>
              <button className="ambient-mode-btn" onClick={() => setLoop(!loop)} title="Repetir">
                <LoopIcon active={loop} size={16} />
              </button>
            </div>
          </div>

          {/* Agent feedback */}
          {commandFeedback && (
            <div className="ambient-feedback">
              {commandFeedback}
            </div>
          )}

          <audio
            ref={audioRef}
            src={activeTrack?.url}
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
          />
        </div>

        {/* RIGHT: Library panel */}
        <div className="ambient-library-panel">
          <div className="ambient-library-header">
            <h3 className="ambient-library-title">Biblioteca</h3>
            <span className="ambient-library-count">{tracks.length} tracks</span>
            <button
              className="ambient-restore-btn"
              onClick={restoreDemos}
              disabled={isRestoring}
            >
              {isRestoring ? 'Descargando...' : 'Restaurar Originales'}
            </button>
          </div>

          <div className="ambient-track-list">
            {tracks.map(track => {
              const isActive = activeTrack?.id === track.id;
              const isConfirming = deleteConfirm === track.id;
              return (
                <div
                  key={track.id}
                  className={`ambient-track-item ${isActive ? 'ambient-track-item-active' : ''}`}
                  onClick={() => play(track)}
                >
                  <div className="ambient-track-item-num">
                    {isActive && isPlaying ? (
                      <div className="ambient-track-mini-wave">
                        <span /><span /><span />
                      </div>
                    ) : (
                      getTrackNumber(track.id)
                    )}
                  </div>

                  <div className={`ambient-track-item-icon ${isActive ? 'ambient-track-item-icon-active' : ''}`}>
                    {isActive && isPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                  </div>

                  <div className="ambient-track-item-info">
                    <div className="ambient-track-item-name" title={track.title}>{track.title}</div>
                    <div className="ambient-track-item-meta">
                      {track.id.startsWith('demo-') ? 'Demo' : 'Local'}
                    </div>
                  </div>

                  <div className="ambient-track-item-actions" onClick={e => e.stopPropagation()}>
                    {isConfirming ? (
                      <button
                        className="ambient-delete-confirm"
                        onClick={(e) => handleDeleteClick(e, track.id)}
                      >
                        Borrar?
                      </button>
                    ) : (
                      <button
                        className="ambient-delete-btn"
                        onClick={(e) => handleDeleteClick(e, track.id)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {tracks.length === 0 && (
              <div className="ambient-empty">
                <MusicNoteIcon size={40} />
                <p>No hay tracks en la biblioteca</p>
                <p className="ambient-empty-hint">Subi archivos de audio o restaura los originales</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
