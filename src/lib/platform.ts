import type { Quality } from '../types';
import { createJSONStorage } from 'zustand/middleware';

export function hasWebGL(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has('fallback')) return false;
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** GPU name via WEBGL_debug_renderer_info (may be blank on privacy-hardened browsers). */
export function gpuName(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}

export function detectQuality(): Quality {
  try {
    const q = new URLSearchParams(window.location.search).get('quality');
    if (q === 'high' || q === 'balanced' || q === 'lite') return q;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const small = Math.max(window.screen.width, window.screen.height) < 1100;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 8;
    const gpu = gpuName();
    if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) return 'lite';
    if (coarse && small) return mem >= 6 && cores >= 6 ? 'balanced' : 'lite';
    // integrated laptop GPUs: start balanced, the performance monitor can still step down
    if (/intel|uhd|iris|mali|adreno|powervr/i.test(gpu)) return 'balanced';
    if (cores <= 4 || mem <= 4) return 'balanced';
    return 'high';
  } catch {
    return 'balanced';
  }
}

export const lowerQuality = (q: Quality): Quality => (q === 'high' ? 'balanced' : 'lite');

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** localStorage wrapper that never throws (private mode, blocked storage). */
export const safeStorage = createJSONStorage(() => ({
  getItem: (k: string) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* storage unavailable */
    }
  },
  removeItem: (k: string) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* storage unavailable */
    }
  },
}));

/** INR with Indian digit grouping, e.g. 1,24,999 */
export const money = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
