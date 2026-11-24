import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { SceneId } from '../store/experienceStore';

/**
 * Scene registry: each scene is its own lazily loaded chunk. Adding a new
 * dimension = add its data to data/dimensions.ts and one line here.
 */
const loaders: Record<SceneId, () => Promise<{ default: ComponentType }>> = {
  universe: () => import('./UniverseScene'),
  fashion: () => import('./FashionScene'),
  tech: () => import('./TechScene'),
};

export const SCENES: Record<SceneId, LazyExoticComponent<ComponentType>> = {
  universe: lazy(loaders.universe),
  fashion: lazy(loaders.fashion),
  tech: lazy(loaders.tech),
};

/** Warm a scene's chunk before the visitor asks for it. */
export function preloadScene(id: SceneId) {
  void loaders[id]();
}
