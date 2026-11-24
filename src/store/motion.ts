/**
 * Per-frame interaction state that lives OUTSIDE React. Pointer parallax,
 * carousel inertia, 360 rotation and camera targets change every frame;
 * keeping them here means dragging never re-renders a component.
 * (Three.js-free, so the UI chunk can import it without pulling in the engine.)
 */
export const motion = {
  /** normalised pointer, -1..1, for parallax */
  pointer: { x: 0, y: 0 },
  /** universe exploration */
  universe: { progress: 0, target: 0, yaw: 0, yawTarget: 0, pitch: 0, pitchTarget: 0 },
  /** product carousel in the active zone; pos is a float index */
  carousel: { pos: 0, vel: 0, target: null as number | null, dragging: false, count: 1 },
  /** 360 inspection */
  inspect: { rotY: 0, rotYTarget: 0, rotX: 0, rotXTarget: 0, zoom: 1, zoomTarget: 1, vel: 0, dragging: false, idle: 0 },
  /** fitting room turntable + composer ring */
  fitting: { rotY: 0, vel: 0, dragging: false, ring: 0, ringVel: 0 },
  /** 0 = environment normal, 1 = focused on an extracted product */
  focus: { value: 0 },
  /** set by the gesture layer; clicks that end a drag are ignored */
  drag: { moved: false },
};

if (import.meta.env.DEV) (window as unknown as { __motion: typeof motion }).__motion = motion;

/** True if the pointer travelled far enough during this press to count as a drag. */
export const wasDrag = () => motion.drag.moved;

export function resetInspect(rotY = 0) {
  const m = motion.inspect;
  m.rotY = rotY - 0.9;
  m.rotYTarget = rotY;
  m.rotX = 0;
  m.rotXTarget = 0;
  m.zoom = 1.25;
  m.zoomTarget = 1;
  m.vel = 0;
  m.idle = 0;
}

export function carouselGoTo(index: number) {
  const c = motion.carousel;
  c.target = Math.max(0, Math.min(c.count - 1, index));
  c.vel = 0;
}
