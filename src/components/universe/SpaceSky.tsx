import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { NOISE } from '../../lib/glsl';
import { useExperience } from '../../store/experienceStore';

function skyMaterial(warm: number, nebula: number, horizon?: string) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    defines: { NX_OCT: 6 },
    uniforms: {
      uHorizon: { value: new THREE.Color(horizon ?? '#000000') },
      uHorizonAmt: { value: horizon ? 1 : 0 },
      uWarm: { value: warm },
      uNebula: { value: nebula },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uWarm;
      uniform float uNebula;
      uniform vec3 uHorizon;
      uniform float uHorizonAmt;
      varying vec3 vDir;
      ${NOISE}
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 top = vec3(0.004, 0.006, 0.012);
        vec3 mid = vec3(0.012, 0.02, 0.038);
        vec3 low = vec3(0.03, 0.036, 0.055);
        vec3 col = mix(mid, top, smoothstep(0.0, 0.7, h));
        col = mix(col, low, smoothstep(0.15, -0.35, h));
        float n = nx_fbm(d * 2.2);
        float n2 = nx_fbm(d * 4.5 + vec3(5.0, 1.0, 0.0));
        float band = smoothstep(0.45, 0.85, n) * (0.55 + 0.45 * n2);
        vec3 ice = vec3(0.16, 0.3, 0.48);
        vec3 warmC = vec3(0.55, 0.24, 0.1);
        float warmMask = smoothstep(0.55, 0.9, n2) * uWarm;
        col += band * mix(ice, warmC, warmMask) * 0.32 * uNebula;
        col = mix(col, uHorizon, uHorizonAmt * smoothstep(0.22, -0.01, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/**
 * Deep-space backdrop: a midnight gradient and nebula banks rendered ONCE
 * into a cube texture (scene.background), with real twinkling star points
 * on top. Baking keeps a rich procedural sky at almost zero per-frame cost.
 */
export function SpaceSky({ warm = 0.25, nebula = 1, stars = 1, horizon }: { warm?: number; nebula?: number; stars?: number; horizon?: string; octaves?: number; radius?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const quality = useExperience((s) => s.quality);
  const size = quality === 'lite' ? 256 : 512;

  useEffect(() => {
    const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
    const skyScene = new THREE.Scene();
    const mat = skyMaterial(warm, nebula, horizon);
    const geo = new THREE.SphereGeometry(10, 64, 32);
    skyScene.add(new THREE.Mesh(geo, mat));
    new THREE.CubeCamera(0.1, 100, rt).update(gl, skyScene);
    geo.dispose();
    mat.dispose();
    const prev = scene.background;
    scene.background = rt.texture;
    return () => {
      if (scene.background === rt.texture) scene.background = prev;
      rt.dispose();
    };
  }, [gl, scene, size, warm, nebula, horizon]);
  const reduced = useExperience((s) => s.reducedMotion);
  const count = quality === 'lite' ? 1200 : quality === 'balanced' ? 3000 : 5000;
  return stars > 0 ? <Stars radius={320} depth={80} count={Math.round(count * stars)} factor={2.4} saturation={0} fade speed={reduced ? 0 : 0.6} /> : null;
}
