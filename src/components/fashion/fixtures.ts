import * as THREE from 'three';

/** Shared materials & geometries for display fixtures (created once). */
export const MAT = {
  chrome: new THREE.MeshStandardMaterial({ color: '#e2e7ec', roughness: 0.08, metalness: 1 }),
  titanium: new THREE.MeshStandardMaterial({ color: '#7f878f', roughness: 0.3, metalness: 0.95 }),
  graphite: new THREE.MeshStandardMaterial({ color: '#15181d', roughness: 0.45, metalness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: '#b8d4ea', roughness: 0.04, metalness: 0.9, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }),
  frost: new THREE.MeshStandardMaterial({ color: '#dfe8f0', roughness: 0.6, metalness: 0.1, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }),
  warmWhite: new THREE.MeshStandardMaterial({ color: '#efe9de', roughness: 0.35, metalness: 0.2 }),
};

const glowCache = new Map<string, THREE.MeshBasicMaterial>();
export function glow(hex: string, boost = 1.6) {
  // electric lime turns yellow when pushed past 1.0, so it stays an accent
  if (hex.toLowerCase() === '#c6f432') boost = Math.min(boost, 0.95);
  const key = `${hex}:${boost}`;
  let m = glowCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(boost), toneMapped: false });
    glowCache.set(key, m);
  }
  return m;
}

const fresnelCache = new Map<string, THREE.ShaderMaterial>();
/** Cheap glass orb: rim-lit fresnel shell (no transmission pass). */
export function fresnel(hex: string, strength = 0.7) {
  const key = `${hex}:${strength}`;
  let m = fresnelCache.get(key);
  if (!m) {
    m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      uniforms: { uColor: { value: new THREE.Color(hex) }, uStrength: { value: strength } },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uStrength;
        varying vec3 vN; varying vec3 vV;
        void main() {
          float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 3.0);
          gl_FragColor = vec4(uColor * (0.25 + f * 1.4) * uStrength, f * 0.75 * uStrength + 0.03);
        }
      `,
    });
    fresnelCache.set(key, m);
  }
  return m;
}

const poolCache = new Map<string, THREE.ShaderMaterial>();
/** A soft pool of light on the floor (additive radial gradient). */
export function pool(hex: string, strength = 0.35) {
  const key = `${hex}:${strength}`;
  let m = poolCache.get(key);
  if (!m) {
    m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uColor: { value: new THREE.Color(hex) }, uStrength: { value: strength } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uStrength; varying vec2 vUv;
        void main() {
          float r = length(vUv - 0.5) * 2.0;
          float a = pow(max(0.0, 1.0 - r), 2.2) * uStrength;
          gl_FragColor = vec4(uColor * a, 1.0);
        }
      `,
    });
    poolCache.set(key, m);
  }
  return m;
}

export const GEO = {
  stem: new THREE.CylinderGeometry(0.004, 0.004, 0.2, 8),
  puck: new THREE.CylinderGeometry(0.018, 0.018, 0.03, 16),
  bar: new THREE.CylinderGeometry(0.008, 0.008, 0.46, 10),
  disc: new THREE.CylinderGeometry(0.36, 0.33, 0.05, 48),
  ring: new THREE.TorusGeometry(0.34, 0.006, 6, 64),
  orb: new THREE.SphereGeometry(0.46, 40, 24),
  orbRing: new THREE.TorusGeometry(0.56, 0.004, 4, 80),
  frame: new THREE.BoxGeometry(1.08, 2.5, 0.02),
  frameEdgeV: new THREE.BoxGeometry(0.025, 2.54, 0.04),
  frameEdgeH: new THREE.BoxGeometry(1.12, 0.025, 0.04),
  pedestal: new THREE.CylinderGeometry(0.3, 0.36, 1, 40),
  box: new THREE.BoxGeometry(1, 1, 1),
};
