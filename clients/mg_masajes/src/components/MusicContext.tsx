import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface MusicCommand {
  action: 'play' | 'pause' | 'next';
  query?: string | null;
}

interface MusicContextType {
  lastCommand: MusicCommand | null;
  sendMusicCommand: (cmd: MusicCommand) => void;
  isPlaying: boolean;
  currentTrackTitle: string | null;
  setPlaybackState: (playing: boolean, title: string | null) => void;
}

const MusicContext = createContext<MusicContextType>({
  lastCommand: null,
  sendMusicCommand: () => {},
  isPlaying: false,
  currentTrackTitle: null,
  setPlaybackState: () => {},
});

export function MusicProvider({ children }: { children: ReactNode }) {
  const [lastCommand, setLastCommand] = useState<MusicCommand | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string | null>(null);

  const sendMusicCommand = useCallback((cmd: MusicCommand) => {
    setLastCommand({ ...cmd });
  }, []);

  const setPlaybackState = useCallback((playing: boolean, title: string | null) => {
    setIsPlaying(playing);
    setCurrentTrackTitle(title);
  }, []);

  return (
    <MusicContext.Provider value={{ lastCommand, sendMusicCommand, isPlaying, currentTrackTitle, setPlaybackState }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusicCommand() {
  return useContext(MusicContext);
}
