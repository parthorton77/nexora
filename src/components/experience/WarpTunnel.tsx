import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { DIMENSION_BY_ID } from '../../data/dimensions';
import { useExperience } from '../../store/experienceStore';

/**
 * The tunnel between worlds. A streaked cylinder locked to the camera that
 * becomes opaque while scenes swap behind it, so no frame ever "pops".
 */
export function WarpTunnel() {
  const camera = useThree((s) => s.camera);
  const group = useRef<THREE.Group>(null);
  const amount = useRef(0);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.BackSide,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uAmount: { value: 0 },
          uA: { value: new THREE.Color('#c6f432') },
          uB: { value: new THREE.Color('#9fd4ff') },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uAmount;
          uniform vec3 uA;
          uniform vec3 uB;
          varying vec2 vUv;
          float h(float n) { return fract(sin(n) * 43758.5453); }
          void main() {
            float lanes = 90.0;
            float lane = floor(vUv.x * lanes);
            float r = h(lane);
            float speed = 1.5 + r * 3.0;
            float y = fract(vUv.y * (1.0 + r) * 3.0 + uTime * speed * 0.6 + r * 10.0);
            float streak = smoothstep(0.0, 0.05, y) * smoothstep(0.5, 0.08, y) * step(0.55, r);
            float laneMask = smoothstep(0.5, 0.0, abs(fract(vUv.x * lanes) - 0.5)) ;
            vec3 col = mix(uB, uA, r) * streak * laneMask * 2.2;
            vec3 base = vec3(0.01, 0.015, 0.03);
            float far = smoothstep(0.55, 1.0, 1.0 - vUv.y);
            col += vec3(0.9, 0.95, 1.0) * far * 0.6;
            float a = uAmount;
            gl_FragColor = vec4(base * (1.0 - far) + col, a);
          }
        `,
      }),
    [],
  );

  useFrame((_, dt) => {
    const t = useExperience.getState().transition;
    const want = t && t.stage === 'warp' ? 1 : 0;
    const speed = want ? 7 : 1.8;
    amount.current += (want - amount.current) * (1 - Math.exp(-dt * speed));
    if (amount.current < 0.002 && !want) {
      if (group.current) group.current.visible = false;
      return;
    }
    if (t?.via) {
      const d = DIMENSION_BY_ID[t.to === 'universe' ? 'fashion' : t.via];
      mat.uniforms.uA.value.set(d.accent);
      mat.uniforms.uB.value.set(d.field);
    }
    mat.uniforms.uTime.value += dt;
    mat.uniforms.uAmount.value = amount.current;
    if (group.current) {
      group.current.visible = true;
      group.current.position.copy(camera.position);
      group.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group ref={group} visible={false}>
      <mesh material={mat} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -20]} renderOrder={1000} frustumCulled={false}>
        <cylinderGeometry args={[3, 3, 60, 64, 1, true]} />
      </mesh>
    </group>
  );
}
