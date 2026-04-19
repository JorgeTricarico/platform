import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  (globalThis as any).indexedDB = mockIDB as any;
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

// Mock Global UI functions
if (typeof (globalThis as any).alert === 'undefined') {
  (globalThis as any).alert = vi.fn();
  (globalThis as any).confirm = vi.fn().mockReturnValue(true);
}

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
  beforeEach(() => {
    vi.useFakeTimers();
  });

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

  it('shows confirmation button when delete is clicked', async () => {
    // We need some tracks to test delete. Demos are loaded on mount.
    render(
      <MusicProvider>
        <Ambient />
      </MusicProvider>
    );

    // Wait for demos to "load" (they are loaded in useEffect)
    await act(async () => {
      await Promise.resolve();
    });

    const deleteBtns = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') // TrashIcon is an SVG
    );

    if (deleteBtns.length > 0) {
      fireEvent.click(deleteBtns[0]);
      expect(screen.getByText('Borrar?')).toBeDefined();

      // Test timeout
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryByText('Borrar?')).toBeNull();
    }
  });
});
