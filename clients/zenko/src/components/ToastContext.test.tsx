import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

function ToastTrigger({ type, message }: { type: 'success' | 'error' | 'info'; message: string }) {
  const toast = useToast();
  return <button onClick={() => toast[type](message)}>trigger</button>;
}

describe('ToastProvider + useToast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders children without crashing', () => {
    render(<ToastProvider><div>child</div></ToastProvider>);
    expect(screen.getByText('child')).toBeDefined();
  });

  it('shows success toast', async () => {
    render(<ToastProvider><ToastTrigger type="success" message="Guardado" /></ToastProvider>);
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Guardado')).toBeDefined();
  });

  it('shows error toast', () => {
    render(<ToastProvider><ToastTrigger type="error" message="Error!" /></ToastProvider>);
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Error!')).toBeDefined();
  });

  it('auto-dismisses success toast after 4s', () => {
    render(<ToastProvider><ToastTrigger type="success" message="Bye" /></ToastProvider>);
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Bye')).toBeDefined();
    act(() => { vi.advanceTimersByTime(4100); });
    expect(screen.queryByText('Bye')).toBeNull();
  });

  it('auto-dismisses error toast after 6s', () => {
    render(<ToastProvider><ToastTrigger type="error" message="Oops" /></ToastProvider>);
    fireEvent.click(screen.getByText('trigger'));
    act(() => { vi.advanceTimersByTime(4100); });
    expect(screen.getByText('Oops')).toBeDefined(); // still there at 4s
    act(() => { vi.advanceTimersByTime(2100); });
    expect(screen.queryByText('Oops')).toBeNull(); // gone at 6s
  });

  it('dismisses toast on close button click', () => {
    render(<ToastProvider><ToastTrigger type="success" message="Close me" /></ToastProvider>);
    fireEvent.click(screen.getByText('trigger'));
    fireEvent.click(screen.getByLabelText('Cerrar'));
    expect(screen.queryByText('Close me')).toBeNull();
  });

  it('stacks multiple toasts', () => {
    render(
      <ToastProvider>
        <ToastTrigger type="success" message="First" />
        <ToastTrigger type="error" message="Second" />
      </ToastProvider>
    );
    fireEvent.click(screen.getAllByText('trigger')[0]);
    fireEvent.click(screen.getAllByText('trigger')[1]);
    expect(screen.getByText('First')).toBeDefined();
    expect(screen.getByText('Second')).toBeDefined();
  });
});
