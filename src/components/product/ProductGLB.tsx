import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export interface GlbEntry {
  url: string;
  scale?: number;
  offset?: [number, number, number];
  rotation?: [number, number, number];
}

/**
 * Production-asset seam. If a product has a GLB (in its catalogue entry or in
 * /models/manifest.json), it lazy-loads here with the procedural model as the
 * placeholder, and falls back to it if loading fails.
 */
export function WithGLB({ entry, tint, clip, procedural }: { entry: GlbEntry; tint: string; clip?: THREE.Plane[]; procedural: ReactNode }) {
  return (
    <GlbBoundary fallback={procedural}>
      <Suspense fallback={procedural}>
        <GlbModel entry={entry} tint={tint} clip={clip} />
      </Suspense>
    </GlbBoundary>
  );
}

function GlbModel({ entry, tint, clip }: { entry: GlbEntry; tint: string; clip?: THREE.Plane[] }) {
  const { scene } = useGLTF(entry.url);
  const object = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const next = mats.map((m) => {
        const c = m.clone() as THREE.MeshStandardMaterial;
        // materials whose name contains "fabric" (or "body") follow the colour picker
        if (/fabric|body/i.test(c.name) && c.color) c.color.set(tint);
        c.clippingPlanes = clip ?? null;
        return c;
      });
      mesh.material = next.length === 1 ? next[0] : next;
    });
    return clone;
  }, [scene, tint, clip]);
  return <primitive object={object} scale={entry.scale ?? 1} position={entry.offset ?? [0, 0, 0]} rotation={entry.rotation ?? [0, 0, 0]} />;
}

class GlbBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('[NEXORA] GLB failed to load; using the procedural model instead.', err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
