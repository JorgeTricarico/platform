import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PhotoGallery from './PhotoGallery';
import { ToastProvider } from './ToastContext';

const mockPhotos = [
  { id: 'p1', garmentId: 'ORD-1', filename: 'foto1.jpg', url: '/uploads/foto1.jpg', createdAt: '2026-04-05T10:00:00Z' },
  { id: 'p2', garmentId: 'ORD-1', filename: 'foto2.png', url: '/uploads/foto2.png', createdAt: '2026-04-05T11:00:00Z' },
];

vi.mock('../services/api', () => ({
  fetchGarmentPhotos: vi.fn(),
  uploadGarmentPhoto: vi.fn(),
  deleteGarmentPhoto: vi.fn(),
}));

import { fetchGarmentPhotos, uploadGarmentPhoto, deleteGarmentPhoto } from '../services/api';

const mockFetchPhotos = fetchGarmentPhotos as ReturnType<typeof vi.fn>;
const mockUpload = uploadGarmentPhoto as ReturnType<typeof vi.fn>;
const mockDelete = deleteGarmentPhoto as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchPhotos.mockResolvedValue(mockPhotos);
  mockUpload.mockResolvedValue({ id: 'p3', garmentId: 'ORD-1', filename: 'new.jpg', url: '/uploads/new.jpg', createdAt: '2026-04-05T12:00:00Z' });
  mockDelete.mockResolvedValue(undefined);
  window.confirm = vi.fn(() => true);
});

describe('PhotoGallery', () => {
  it('renders photo gallery after loading', async () => {
    render(<ToastProvider><PhotoGallery garmentId="ORD-1" /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('photo-gallery')).toBeInTheDocument();
    });
    expect(screen.getByText('Fotos (2)')).toBeInTheDocument();
  });

  it('shows photo grid with correct number of photos', async () => {
    render(<ToastProvider><PhotoGallery garmentId="ORD-1" /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument();
    });
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
  });

  it('shows empty state when no photos', async () => {
    mockFetchPhotos.mockResolvedValue([]);
    render(<ToastProvider><PhotoGallery garmentId="ORD-1" /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByText(/Sin fotos/)).toBeInTheDocument();
    });
  });

  it('calls fetchGarmentPhotos with the garmentId', async () => {
    render(<ToastProvider><PhotoGallery garmentId="ORD-1" /></ToastProvider>);
    await waitFor(() => {
      expect(mockFetchPhotos).toHaveBeenCalledWith('ORD-1');
    });
  });

  it('uploads a photo when file is selected', async () => {
    render(<ToastProvider><PhotoGallery garmentId="ORD-1" /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument();
    });

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('photo-upload-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith('ORD-1', file);
    });

    // New photo should appear
    await waitFor(() => {
      expect(screen.getByText('Fotos (3)')).toBeInTheDocument();
    });
  });

  it('deletes a photo after confirmation', async () => {
    render(<ToastProvider><PhotoGallery garmentId="ORD-1" /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByLabelText('Eliminar foto1.jpg');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('ORD-1', 'p1');
    });

    await waitFor(() => {
      expect(screen.getByText('Fotos (1)')).toBeInTheDocument();
    });
  });

  it('opens lightbox on photo click', async () => {
    render(<ToastProvider><PhotoGallery garmentId="ORD-1" /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument();
    });

    const images = screen.getAllByRole('img');
    fireEvent.click(images[0]);

    expect(screen.getByTestId('photo-lightbox')).toBeInTheDocument();
  });

  it('closes lightbox on backdrop click', async () => {
    render(<ToastProvider><PhotoGallery garmentId="ORD-1" /></ToastProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument();
    });

    const images = screen.getAllByRole('img');
    fireEvent.click(images[0]);
    expect(screen.getByTestId('photo-lightbox')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('photo-lightbox'));
    expect(screen.queryByTestId('photo-lightbox')).not.toBeInTheDocument();
  });
});
