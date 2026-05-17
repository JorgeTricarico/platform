import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Badge } from './badge';
import { Button } from './button';

// Guarda de regresion: estos tests no validan render visual (jsdom no pinta),
// validan que el contrato variant->clases del design system no se rompa cuando
// alguien renombre tokens o cambie un valor light por accidente.

describe('Badge — variants light theme', () => {
  it.each([
    ['recibido',   'bg-status-recibido-bg',   'text-status-recibido-text',   'border-status-recibido-border'],
    ['en_proceso', 'bg-status-proceso-bg',    'text-status-proceso-text',    'border-status-proceso-border'],
    ['listo',      'bg-status-listo-bg',      'text-status-listo-text',      'border-status-listo-border'],
    ['entregado',  'bg-status-entregado-bg',  'text-status-entregado-text',  'border-status-entregado-border'],
    ['overdue',    'bg-status-overdue-bg',    'text-status-overdue-text',    'border-status-overdue-border'],
  ] as const)('variant=%s aplica las clases de status %s', (variant, bg, text, border) => {
    const { container } = render(<Badge variant={variant}>x</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain(bg);
    expect(el.className).toContain(text);
    expect(el.className).toContain(border);
  });
});

describe('Button — variants light theme', () => {
  it.each([
    ['default',     ['bg-primary', 'text-primary-foreground']],
    ['destructive', ['bg-destructive']],
    // Regresion guard: outline DEBE usar bg-card (no bg-background) para
    // tener contraste visible sobre el body crema.
    ['outline',     ['bg-card', 'text-foreground', 'border']],
    ['success',     ['bg-status-listo-bg', 'text-status-listo-text', 'border-status-listo-border']],
    ['warning',     ['bg-status-recibido-bg', 'text-status-recibido-text', 'border-status-recibido-border']],
    ['info',        ['bg-status-proceso-bg', 'text-status-proceso-text', 'border-status-proceso-border']],
  ] as const)('variant=%s incluye %j', (variant, classes) => {
    const { container } = render(<Button variant={variant}>x</Button>);
    const el = container.firstChild as HTMLElement;
    classes.forEach(c => expect(el.className).toContain(c));
  });

  it('outline NO usa bg-background (regresion: era invisible sobre body crema)', () => {
    const { container } = render(<Button variant="outline">x</Button>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toMatch(/\bbg-background\b/);
  });
});

describe('index.css — tokens light alineados al logo Kitsune', () => {
  const css = readFileSync(path.resolve(__dirname, '../../index.css'), 'utf-8');

  it.each([
    // Brand
    ['--color-primary',       '#D66D26'],
    ['--color-background',    '#F6F1EA'],
    ['--color-foreground',    '#382416'],
    // Status (paleta tierra)
    ['--color-status-recibido-bg',     '#FAEFD9'],
    ['--color-status-recibido-text',   '#7A4A11'],
    ['--color-status-recibido-border', '#E8C887'],
    ['--color-status-proceso-bg',      '#E5EBF2'],
    ['--color-status-proceso-text',    '#2C4566'],
    ['--color-status-proceso-border',  '#B8C5D6'],
    ['--color-status-listo-bg',        '#E8EFE0'],
    ['--color-status-listo-text',      '#3D5A2A'],
    ['--color-status-listo-border',    '#BFD4A8'],
    ['--color-status-entregado-bg',    '#EFE7D8'],
    ['--color-status-entregado-text',  '#5A4733'],
    ['--color-status-entregado-border','#D6C7AE'],
    ['--color-status-overdue-bg',      '#F8E2D2'],
    ['--color-status-overdue-text',    '#8B3014'],
    ['--color-status-overdue-border',  '#EFC2A0'],
  ])('%s = %s', (token, hex) => {
    const re = new RegExp(`${token.replace(/-/g, '\\-')}:\\s*${hex}\\b`, 'i');
    expect(css).toMatch(re);
  });

  it('dark mode sigue presente con override del background', () => {
    expect(css).toMatch(/\[data-theme="dark"\][\s\S]*--color-background:\s*#1A1108/);
  });
});
