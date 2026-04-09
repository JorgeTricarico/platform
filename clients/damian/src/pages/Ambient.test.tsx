import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Ambient from './Ambient';
import { MusicProvider } from '../components/MusicContext';

// Mock IndexedDB for jsdom environment
if (typeof indexedDB === 'undefined') {
  const mockIDB = {
    open: vi.fn().mockReturnValue({
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      result: {
        createObjectStore: vi.fn(),
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            getAll: vi.fn().mockReturnValue({ onsuccess: null }),
            add: vi.fn().mockReturnValue({ onsuccess: null }),
            delete: vi.fn().mockReturnValue({ onsuccess: null }),
          })
        })
      }
    })
  };
  global.indexedDB = mockIDB as any;
}

// Mock MusicCommand to provide default state
vi.mock('../components/MusicContext', async () => {
  const actual = await vi.importActual('../components/MusicContext');
  return {
    ...actual,
    useMusicCommand: () => ({
      lastCommand: null,
      setPlaybackState: vi.fn(),
      isPlaying: false,
      currentTrackTitle: null,
    }),
  };
});

// Mock loadAllFromDB to avoid IndexedDB issues in tests
vi.mock('./Ambient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./Ambient')>();
  return {
    ...mod,
    // We can't easily mock internal functions defined in the same file without exporting them
    // but we can try to mock the component behavior or just ignore DB errors
  };
});

describe('Ambient Page', () => {
  it('renders "Música Ambiente" header', async () => {
    render(
      <MusicProvider>
        <Ambient />
      </MusicProvider>
    );
    expect(screen.getByText('Música Ambiente')).toBeDefined();
  });

  it('renders "Agregar Audio" button', async () => {
    render(
      <MusicProvider>
        <Ambient />
      </MusicProvider>
    );
    expect(screen.getByText('+ Agregar Audio')).toBeDefined();
  });
});
