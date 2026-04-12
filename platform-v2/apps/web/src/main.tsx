/**
 * Entry point — reads VITE_TENANT env var to determine which tenant to load.
 *
 * Resolution order:
 *   1. VITE_TENANT env var  →  loads tenants/{slug}/config.ts
 *   2. Falls back to "zenco"
 *
 * The loaded TenantConfig is passed down via TenantContext so all
 * components can read tenant-specific values without prop-drilling.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { loadTenantConfig } from '@platform/config';
import type { TenantConfig } from '@platform/types';
import App from './App.js';
import './index.css';

const tenantSlug = (import.meta.env['VITE_TENANT'] as string | undefined) ?? 'zenco';

async function boot() {
  let config;
  try {
    config = await loadTenantConfig(tenantSlug);
  } catch (err) {
    console.error('[main] Failed to load tenant config:', err);
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;font-family:system-ui">
        <div style="max-width:480px;text-align:center">
          <h1 style="font-size:1.5rem;font-weight:600;margin-bottom:1rem">Error de configuración</h1>
          <p style="color:#6b7280">No se pudo cargar la configuración para el negocio "<strong>${tenantSlug}</strong>".</p>
          <pre style="margin-top:1rem;padding:1rem;background:#f3f4f6;border-radius:8px;text-align:left;font-size:0.75rem;overflow:auto">${String(err)}</pre>
        </div>
      </div>
    `;
    return;
  }

  // Apply tenant theme CSS variables to :root
  const root = document.documentElement;
  if (config.theme.primaryColor) {
    root.style.setProperty('--tenant-primary', config.theme.primaryColor);
  }
  if (config.theme.accentColor) {
    root.style.setProperty('--tenant-accent', config.theme.accentColor);
  }

  // Update page title
  document.title = config.name;

  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('#root element not found');

  createRoot(rootEl).render(
    <StrictMode>
      <App tenant={config as unknown as TenantConfig} />
    </StrictMode>,
  );
}

void boot();
