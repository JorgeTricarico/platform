import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface MusicCommand {
  action: 'play' | 'pause' | 'next';
  query?: string | null;
}

interface MusicContextType {
  lastCommand: MusicCommand | null;
  sendMusicCommand: (cmd: MusicCommand) => void;
}

const MusicContext = createContext<MusicContextType>({
  lastCommand: null,
  sendMusicCommand: () => {},
});

export function MusicProvider({ children }: { children: ReactNode }) {
  const [lastCommand, setLastCommand] = useState<MusicCommand | null>(null);

  const sendMusicCommand = useCallback((cmd: MusicCommand) => {
    setLastCommand({ ...cmd });
  }, []);

  return (
    <MusicContext.Provider value={{ lastCommand, sendMusicCommand }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusicCommand() {
  return useContext(MusicContext);
}
