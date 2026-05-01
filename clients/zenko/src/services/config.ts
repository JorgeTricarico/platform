import { BUSINESS } from '../config/business';

const PROD_BACKEND = 'https://platform-backend-8upb.onrender.com';
const LOCAL_BACKEND = 'http://localhost:3000';

function detectBackend(): string {
  // 1. Explicit env var takes precedence
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const base = envUrl.replace(/\/$/, '');
    return base.includes('/api/') ? base.replace(/\/api\/.*$/, '') : base;
  }
  if (typeof window === 'undefined') return LOCAL_BACKEND;
  const host = window.location.hostname;
  // 2. Render production
  if (host.includes('onrender.com')) return PROD_BACKEND;
  // 3. Local dev (localhost or phone via IP) → use relative URLs so
  //    Vite's dev proxy handles forwarding to localhost:3000 over HTTPS
  return '';
}

const BACKEND_URL = detectBackend();

/** Full API URL for this business: /api/<slug>/* */
export const API_URL = `${BACKEND_URL}/api/${BUSINESS.slug}`;

/** Base backend URL for shared routes: /api/auth/*, /uploads/* */
export const API_BASE = BACKEND_URL;

/** True if running on Render production */
export const IS_PRODUCTION =
  typeof window !== 'undefined' && window.location.hostname.includes('onrender.com');
