import * as THREE from 'three';
import type { Product } from '../types';
import { garmentOf, hangingBuild, type Anchor, type GarmentBuild } from './garments';
import { techBuild } from './tech/builders';

/**
 * One entry point for "give me the 3D build of this product", whatever its
 * dimension. Also guarantees a `logo` anchor so every product can show its mark.
 */
export function productBuild(p: Product, lite: boolean): GarmentBuild {
  const build = p.model.type === 'garment' ? hangingBuild(p, lite) : techBuild(p, lite);
  if (!build.anchors.logo) {
    const fallback = logoFallback(p, build);
    if (fallback) build.anchors.logo = fallback;
  }
  return build;
}

function logoFallback(p: Product, b: GarmentBuild): Anchor | null {
  const g = garmentOf(p);
  const from = (name: string, push = 0.002, shift?: THREE.Vector3): Anchor | null => {
    const a = b.anchors[name];
    if (!a) return null;
    const pos = a.p.clone().addScaledVector(a.n, push);
    if (shift) pos.add(shift);
    return { p: pos, n: a.n.clone() };
  };
  if (!g) return null;
  switch (g.kind) {
    case 'bottom':
      return from('waistband', 0.001);
    case 'sneaker':
      return from('heel', -0.004);
    case 'cap':
      return from('crown', -0.004);
    case 'bag':
      return from('body', -0.004);
    default:
      return null;
  }
}

/** Real-world size → display scale so a watch and a jacket read at similar sizes. */
export function displayScale(p: Product, b: GarmentBuild): number {
  const longest = Math.max(b.size.x, b.size.y, b.size.z);
  const g = garmentOf(p);
  if (g?.kind === 'top' || g?.kind === 'bottom') return 1;
  const want = g ? (g.kind === 'sneaker' ? 0.42 : 0.36) : 0.44;
  return want / Math.max(0.02, longest);
}

let logoTex: THREE.CanvasTexture | null = null;
/** The NX mark, drawn once into a canvas (no image download). */
export function logoTexture(): THREE.CanvasTexture {
  if (logoTex) return logoTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0d0f13';
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 120, 28);
  ctx.fill();
  ctx.strokeStyle = '#c9d3de';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(64, 64, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#c6f432';
  ctx.beginPath();
  ctx.arc(64, 64, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e9edf1';
  ctx.font = '600 58px Sora, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('NX', 118, 68);
  logoTex = new THREE.CanvasTexture(c);
  logoTex.colorSpace = THREE.SRGBColorSpace;
  logoTex.anisotropy = 4;
  return logoTex;
}
