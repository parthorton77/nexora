import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { hasWebGL } from './lib/platform';
import { loadAssetManifest } from './lib/assets';
import { useExperience } from './store/experienceStore';
import { GestureLayer } from './components/interface/GestureLayer';
import { KeyboardController } from './components/interface/KeyboardController';
import { Loader } from './components/interface/Loader';
import { Interface } from './components/interface/Interface';
import { Fallback } from './components/interface/Fallback';

const Experience = lazy(() =>
  import('./components/experience/Experience').then((m) => {
    useExperience.setState({ progress: 0.4, status: 'Starting the engine' });
    return m;
  }),
);

/** Any crash inside the 3D world falls back to the 2D catalogue, with the same bag and wishlist. */
class WorldBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('NEXORA 3D world failed, switching to the 2D catalogue', error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function App() {
  const [webgl, setWebgl] = useState(() => hasWebGL());
  const quality = useExperience((s) => s.quality);
  useEffect(() => {
    document.documentElement.dataset.quality = quality;
  }, [quality]);

  useEffect(() => {
    useExperience.setState({ progress: 0.1, status: 'Loading the engine' });
    void loadAssetManifest();
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => useExperience.getState().setReducedMotion(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  if (!webgl) return <Fallback reason="This device or browser cannot run WebGL, so NEXORA is showing its 2D catalogue." />;

  return (
    <div className="fixed inset-0 overflow-hidden bg-void">
      <GestureLayer>
        <WorldBoundary onError={() => setWebgl(false)}>
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </WorldBoundary>
      </GestureLayer>
      <Interface />
      <KeyboardController />
      <Loader />
    </div>
  );
}
