import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

/** `?fx=none` disables post-processing (debug / comparison). */
const FX = new URLSearchParams(window.location.search).get('fx');

/**
 * Post-processing on the cinematic tier only: bloom for the light
 * architecture, a soft vignette, and ACES tone mapping (the composer renders
 * into a linear buffer, so tone mapping must happen here, last).
 */
export default function Effects() {
  if (FX === 'none') return null;
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.3} intensity={0.55} radius={0.7} />
      <Vignette offset={0.32} darkness={0.6} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
