import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NOISE } from '../../lib/glsl';
import { useExperience } from '../../store/experienceStore';

/** A sea of slow clouds far below the islands (one shader plane). */
export function CloudSea({ y = -26, size = 900, tint = '#7f9ab4', warmth = '#e8692c' }: { y?: number; size?: number; tint?: string; warmth?: string }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uTint: { value: new THREE.Color(tint) }, uWarm: { value: new THREE.Color(warmth) } },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uTint;
          uniform vec3 uWarm;
          varying vec3 vWorld;
          ${NOISE}
          void main() {
            vec2 p = vWorld.xz * 0.012;
            float n = nx_fbm(vec3(p.x + uTime * 0.01, p.y - uTime * 0.006, uTime * 0.01));
            float n2 = nx_fbm(vec3(p * 2.6, uTime * 0.02 + 4.0));
            float d = length(vWorld.xz - cameraPosition.xz);
            float fade = smoothstep(420.0, 90.0, d);
            float a = smoothstep(0.38, 0.75, n) * (0.55 + 0.45 * n2) * fade;
            vec3 col = mix(uTint * 0.22, uTint * 0.55, n2);
            col += uWarm * 0.08 * smoothstep(0.6, 0.9, n2);
            gl_FragColor = vec4(col, a * 0.75);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    [tint, warmth],
  );
  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt;
  });
  return (
    <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, -60]} renderOrder={-2}>
      <planeGeometry args={[size, size, 1, 1]} />
    </mesh>
  );
}

/** Fake volumetric light: an additive cone that fades along its length and at the rim. */
export function LightShaft({
  position,
  rotation = [0, 0, 0],
  height = 40,
  top = 1.2,
  bottom = 9,
  color = '#cfe6ff',
  intensity = 0.35,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  height?: number;
  top?: number;
  bottom?: number;
  color?: string;
  intensity?: number;
}) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vNormalV;
          varying vec3 vViewDir;
          void main() {
            vUv = uv;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNormalV = normalize(normalMatrix * normal);
            vViewDir = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uIntensity;
          uniform float uTime;
          varying vec2 vUv;
          varying vec3 vNormalV;
          varying vec3 vViewDir;
          void main() {
            float rim = abs(dot(normalize(vNormalV), normalize(vViewDir)));
            float soft = pow(clamp(rim, 0.0, 1.0), 2.2);
            float along = pow(clamp(vUv.y, 0.0, 1.0), 1.4) * smoothstep(0.0, 0.18, 1.0 - vUv.y);
            float flick = 0.88 + 0.12 * sin(uTime * 0.7 + vUv.x * 25.0);
            gl_FragColor = vec4(uColor * soft * along * uIntensity * flick, 1.0);
          }
        `,
      }),
    [color, intensity],
  );
  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt;
  });
  return (
    <mesh material={mat} position={position} rotation={rotation} renderOrder={5}>
      <cylinderGeometry args={[top, bottom, height, 40, 1, true]} />
    </mesh>
  );
}

/** Soft dust motes drifting upward through the scene. */
export function Dust({ count = 900, area = [90, 40, 140] as [number, number, number], center = [0, 10, 0] as [number, number, number], color = '#cfe0f0', size = 1 }) {
  const ref = useRef<THREE.Points>(null);
  const { geo, mat } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = center[0] + (Math.random() - 0.5) * area[0];
      p[i * 3 + 1] = center[1] + (Math.random() - 0.5) * area[1];
      p[i * 3 + 2] = center[2] + (Math.random() - 0.5) * area[2];
      s[i] = Math.random();
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uHeight: { value: area[1] }, uBase: { value: center[1] - area[1] / 2 }, uSize: { value: size } },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime;
        uniform float uHeight;
        uniform float uBase;
        uniform float uSize;
        varying float vA;
        void main() {
          vec3 p = position;
          p.y = uBase + mod(p.y - uBase + uTime * (0.25 + aSeed * 0.5), uHeight);
          p.x += sin(uTime * 0.2 + aSeed * 30.0) * 0.6;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * (14.0 + aSeed * 22.0) / -mv.z;
          vA = (0.35 + 0.65 * sin(uTime * (0.5 + aSeed) + aSeed * 50.0) * 0.5 + 0.5) * smoothstep(120.0, 10.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(uColor * a * vA * 0.55, 1.0);
        }
      `,
    });
    return { geo: g, mat: m };
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    if (!useExperience.getState().reducedMotion) mat.uniforms.uTime.value += dt;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

/** A ribbon of flowing light along a curve: the path that says "go here". */
export function GlowPath({ points, width = 0.6, color = '#c6f432', color2 = '#9fd4ff', speed = 1 }: { points: [number, number, number][]; width?: number; color?: string; color2?: string; speed?: number }) {
  const { geo, mat } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    const segs = 200;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const t = new THREE.Vector3();
    const side = new THREE.Vector3();
    const len = curve.getLength();
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const p = curve.getPointAt(u);
      curve.getTangentAt(u, t);
      side.crossVectors(t, up).normalize().multiplyScalar(width / 2);
      pos.push(p.x - side.x, p.y + 0.02, p.z - side.z, p.x + side.x, p.y + 0.02, p.z + side.z);
      uv.push(u * len, 0, u * len, 1);
      if (i < segs) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
      uniforms: { uTime: { value: 0 }, uA: { value: new THREE.Color(color) }, uB: { value: new THREE.Color(color2) }, uLen: { value: len }, uSpeed: { value: speed } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uA;
        uniform vec3 uB;
        uniform float uLen;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
          float core = smoothstep(0.0, 0.5, edge);
          float centre = smoothstep(0.75, 1.0, edge);
          float dash = smoothstep(0.55, 1.0, sin((vUv.x * 0.9 - uTime * 3.2 * uSpeed)) * 0.5 + 0.5);
          float k = vUv.x / uLen;
          vec3 col = mix(uB, uA, k);
          float a = core * 0.16 + centre * 0.55 + dash * centre * 1.3;
          a *= smoothstep(0.0, 0.04, k) ;
          gl_FragColor = vec4(col * a, 1.0);
        }
      `,
    });
    return { geo: g, mat: m };
  }, [points, width, color, color2, speed]);
  useFrame((_, dt) => {
    if (!useExperience.getState().reducedMotion) mat.uniforms.uTime.value += dt;
  });
  return <mesh geometry={geo} material={mat} renderOrder={4} />;
}
