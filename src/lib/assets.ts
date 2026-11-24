import { create } from 'zustand';

export interface GlbEntry {
  url: string;
  scale?: number;
  offset?: [number, number, number];
  rotation?: [number, number, number];
}

/** GLB overrides from /models/manifest.json, keyed by product id (empty in the prototype). */
export const useAssets = create<{ glb: Record<string, GlbEntry> }>(() => ({ glb: {} }));

export async function loadAssetManifest() {
  try {
    const res = await fetch('/models/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const json = (await res.json()) as { products?: Record<string, GlbEntry> };
    if (json.products && Object.keys(json.products).length) useAssets.setState({ glb: json.products });
  } catch {
    /* no manifest: procedural models only */
  }
}
