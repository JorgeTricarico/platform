import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner, SkeletonLoader, SkeletonCard } from './SkeletonLoader';

describe('Spinner', () => {
  it('renderiza con tamaño default (20)', () => {
    const { container } = render(<Spinner />);
    const el = container.querySelector('.spinner-inline') as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.style.width).toBe('20px');
    expect(el.style.height).toBe('20px');
  });

  it('renderiza con tamaño personalizado', () => {
    const { container } = render(<Spinner size={40} />);
    const el = container.querySelector('.spinner-inline') as HTMLElement;
    expect(el.style.width).toBe('40px');
    expect(el.style.height).toBe('40px');
  });
});

describe('SkeletonLoader', () => {
  it('renderiza N filas skeleton (default 5)', () => {
    const { container } = render(<SkeletonLoader />);
    // 1 título skeleton + 5 filas = 6 elementos con clase animate-pulse
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(6);
  });

  it('renderiza con rows personalizado', () => {
    const { container } = render(<SkeletonLoader rows={3} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(4); // 1 título + 3 filas
  });
});

describe('SkeletonCard', () => {
  it('renderiza sin errores', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('contiene skeletons internos', () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });
});
