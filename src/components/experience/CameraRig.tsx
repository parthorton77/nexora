import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { motion } from '../../store/motion';
import { rig } from '../../store/rig';
import { useExperience } from '../../store/experienceStore';

const look = new THREE.Vector3();
const want = new THREE.Vector3();
const offset = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const fwd = new THREE.Vector3();

/**
 * The one place that moves the camera. Scenes and the transition director
 * write a "shot" (rig.pos / rig.look / rig.fov); the rig damps toward it and
 * layers a subtle pointer parallax on top. Damping keeps every move smooth,
 * so nothing ever jumps.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const reduced = useExperience.getState().reducedMotion;
    const hard = rig.flying || rig.snap > 0;
    if (rig.snap > 0) rig.snap--;
    const k = hard ? 1 : 1 - Math.exp(-dt * rig.lambda);

    want.copy(rig.pos);
    // pointer parallax: shift the eye in the camera plane, keep the target
    const para = reduced || hard ? 0 : rig.parallax * 0.35;
    if (para > 0) {
      fwd.subVectors(rig.look, rig.pos).normalize();
      right.crossVectors(fwd, THREE.Object3D.DEFAULT_UP).normalize();
      up.crossVectors(right, fwd).normalize();
      const dist = rig.pos.distanceTo(rig.look);
      const s = para * Math.min(1, dist / 6);
      offset.copy(right).multiplyScalar(motion.pointer.x * s).addScaledVector(up, motion.pointer.y * s * 0.55);
      want.add(offset);
    }

    camera.position.lerp(want, k);
    rig.actualLook.lerp(rig.look, hard ? 1 : 1 - Math.exp(-dt * rig.lambda * 1.25));
    look.copy(rig.actualLook);
    camera.lookAt(look);
    rig.actualPos.copy(camera.position);
    // adaptive camera: portrait screens get a wider lens so scenes still read
    const aspect = size.width / Math.max(1, size.height);
    const wantFov = rig.fov * (aspect < 1 ? Math.min(1.4, 1 + (1 - aspect) * 0.55) : 1);
    const fov = camera.fov + (wantFov - camera.fov) * (hard ? 1 : 1 - Math.exp(-dt * 3));
    if (Math.abs(fov - camera.fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, -10);
  return null;
}
