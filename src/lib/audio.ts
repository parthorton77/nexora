/**
 * Generative sound design (WebAudio, no audio files). Silent until the user
 * explicitly enables it — the AudioContext is only created on that gesture.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: { stop: () => void } | null = null;
  private noise: AudioBuffer | null = null;
  enabled = false;
  private lastTick = 0;

  private ensure() {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 1.5;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return this.ctx;
  }

  async enable() {
    const ctx = this.ensure();
    if (!ctx || !this.master) return false;
    if (ctx.state === 'suspended') await ctx.resume();
    this.enabled = true;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0.55, ctx.currentTime, 0.6);
    if (!this.ambient) this.ambient = this.startAmbient();
    return true;
  }

  disable() {
    this.enabled = false;
    if (!this.ctx || !this.master) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
  }

  private startAmbient() {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.gain.value = 0.05;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = 0.4;
    filter.connect(out);
    out.connect(this.master!);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.045;
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    // a soft, open chord (A2, E3, B3, C#4)
    const oscs = [110, 164.81, 246.94, 277.18].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 === 0 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 4;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.22;
      o.connect(g);
      g.connect(filter);
      o.start();
      return o;
    });
    // air
    const air = ctx.createBufferSource();
    air.buffer = this.noise;
    air.loop = true;
    const airF = ctx.createBiquadFilter();
    airF.type = 'bandpass';
    airF.frequency.value = 900;
    airF.Q.value = 0.6;
    const airG = ctx.createGain();
    airG.gain.value = 0.06;
    air.connect(airF);
    airF.connect(airG);
    airG.connect(out);
    air.start();
    return {
      stop: () => {
        oscs.forEach((o) => o.stop());
        lfo.stop();
        air.stop();
      },
    };
  }

  private env(g: GainNode, peak: number, attack: number, decay: number) {
    const t = this.ctx!.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  /** soft detent as the rail snaps to a garment */
  tick() {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastTick < 45) return;
    this.lastTick = now;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 1750;
    o.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.05);
    o.connect(g);
    g.connect(this.master!);
    this.env(g, 0.06, 0.003, 0.06);
    o.start();
    o.stop(this.ctx.currentTime + 0.1);
  }

  /** air movement when a garment is pulled out */
  whoosh(reverse = false) {
    if (!this.enabled || !this.ctx || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    const t = this.ctx.currentTime;
    f.frequency.setValueAtTime(reverse ? 1800 : 260, t);
    f.frequency.exponentialRampToValueAtTime(reverse ? 260 : 1800, t + 0.7);
    const g = this.ctx.createGain();
    src.connect(f);
    f.connect(g);
    g.connect(this.master!);
    this.env(g, 0.16, 0.18, 0.6);
    src.start();
    src.stop(t + 0.9);
  }

  /** confirmation chime */
  chime() {
    if (!this.enabled || !this.ctx) return;
    [880, 1318.5, 1760].forEach((f, i) => {
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      g.connect(this.master!);
      const t0 = this.ctx!.currentTime + i * 0.06;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.07 / (i + 1), t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
      o.start(t0);
      o.stop(t0 + 1.2);
    });
  }

  /** subtle UI press */
  soft() {
    if (!this.enabled || !this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 520;
    o.connect(g);
    g.connect(this.master!);
    this.env(g, 0.035, 0.004, 0.09);
    o.start();
    o.stop(this.ctx.currentTime + 0.12);
  }

  /** faint glassy ping when a portal is hovered */
  hover() {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastTick < 120) return;
    this.lastTick = now;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 1320;
    o.connect(g);
    g.connect(this.master!);
    this.env(g, 0.025, 0.01, 0.5);
    o.start();
    o.stop(this.ctx.currentTime + 0.6);
  }

  /** portal activation: a slow rising sweep with a shimmer on top */
  portal() {
    if (!this.enabled || !this.ctx || !this.noise) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 2.2);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(2400, t + 2.2);
    o.connect(lp);
    lp.connect(g);
    g.connect(this.master!);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    o.start(t);
    o.stop(t + 2.9);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'highpass';
    bp.frequency.value = 5000;
    const ng = this.ctx.createGain();
    src.connect(bp);
    bp.connect(ng);
    ng.connect(this.master!);
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.04, t + 1.6);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    src.start(t);
    src.stop(t + 2.7);
  }

  /** rising tone for the fitting-room scan */
  scan() {
    if (!this.enabled || !this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    const t = this.ctx.currentTime;
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(660, t + 1.4);
    o.connect(g);
    g.connect(this.master!);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.start();
    o.stop(t + 1.7);
  }
}

export const sound = new SoundEngine();
