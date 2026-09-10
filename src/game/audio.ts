// ---------------------------------------------------------------------------
// AudioManager — synthesises a looping "cosmic" arpeggio soundtrack and a set
// of arcade sound-effects entirely through the Web Audio API (no asset files).
// ---------------------------------------------------------------------------

type Osc = OscillatorType;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private delay!: DelayNode;
  private delayFb!: GainNode;

  private musicOn = false;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;

  private musicVol = 0.5;
  private sfxVol = 0.7;
  private musicMuted = false;
  private sfxMuted = false;

  private readonly bpm = 84;
  private readonly scale = [0, 2, 3, 5, 7, 8, 10, 12]; // natural minor-ish
  private readonly root = 110; // A2

  get ready() {
    return this.ctx !== null;
  }

  init() {
    if (this.ctx) return;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    // spacey feedback delay used by both buses
    this.delay = ctx.createDelay(1.2);
    this.delay.delayTime.value = 0.38;
    this.delayFb = ctx.createGain();
    this.delayFb.gain.value = 0.36;
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0.3;
    this.delay.connect(this.delayFb);
    this.delayFb.connect(this.delay);
    this.delay.connect(delayWet);
    delayWet.connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicMuted ? 0 : this.musicVol;
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.delay);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxMuted ? 0 : this.sfxVol;
    this.sfxBus.connect(this.master);
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMusicVolume(v: number) {
    this.musicVol = v;
    if (this.musicBus) this.musicBus.gain.value = this.musicMuted ? 0 : v;
  }
  setSfxVolume(v: number) {
    this.sfxVol = v;
    if (this.sfxBus) this.sfxBus.gain.value = this.sfxMuted ? 0 : v;
  }
  setMusicMuted(m: boolean) {
    this.musicMuted = m;
    if (this.musicBus)
      this.musicBus.gain.value = m ? 0 : this.musicVol;
  }
  setSfxMuted(m: boolean) {
    this.sfxMuted = m;
    if (this.sfxBus) this.sfxBus.gain.value = m ? 0 : this.sfxVol;
  }

  // ----- music ------------------------------------------------------------
  startMusic() {
    this.init();
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    // drift the shimmer slowly
    this.timer = window.setInterval(() => this.scheduler(), 60);
  }

  stopMusic() {
    this.musicOn = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private scheduler() {
    if (!this.ctx || !this.musicOn) return;
    const spb = 60 / this.bpm / 2; // eighth notes
    while (this.nextTime < this.ctx.currentTime + 0.22) {
      this.playStep(this.step, this.nextTime);
      this.step = (this.step + 1) % 64;
      this.nextTime += spb;
    }
  }

  private playStep(step: number, t: number) {
    // bar grouping of 8 eighth-notes
    const bar = Math.floor(step / 8) % 4;
    const chordRoots = [0, -3, -5, -3]; // relative semitone movement
    const base = this.root * Math.pow(2, chordRoots[bar] / 12);

    // bass drone on the downbeat
    if (step % 8 === 0) {
      this.note(base / 2, t, 4 * 0.36, 0.16, "triangle", this.musicBus, 0.9);
    }

    // sparse pad every bar
    if (step % 8 === 0) {
      this.note(base, t, 4 * 0.36, 0.045, "sawtooth", this.musicBus, 2.4);
      this.note(
        base * Math.pow(2, 7 / 12),
        t,
        4 * 0.36,
        0.035,
        "sawtooth",
        this.musicBus,
        2.4
      );
    }

    // arpeggio melody
    const arp = [0, 2, 4, 7, 4, 2, 4, 5];
    const deg = arp[step % 8];
    const octave = step % 16 < 8 ? 1 : 2;
    if (Math.random() > 0.12) {
      const freq = base * Math.pow(2, (this.scale[deg % 8] / 12) + octave);
      this.note(freq, t, 0.5, 0.05, "triangle", this.musicBus, 1.2);
    }

    // sparkle detail
    if (step % 8 === 6 && Math.random() > 0.5) {
      const freq = base * Math.pow(2, 1 + 24 / 12);
      this.note(freq, t, 0.7, 0.025, "sine", this.musicBus, 3);
    }
  }

  // ----- sfx --------------------------------------------------------------
  private blip(
    freq: number,
    dur: number,
    vol: number,
    type: Osc,
    bend = 0,
    dest?: AudioNode
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (bend !== 0)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(30, freq + bend),
        t + dur
      );
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private note(
    freq: number,
    time: number,
    dur: number,
    vol: number,
    type: Osc,
    dest: AudioNode,
    filterHz = 1.1
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900 * filterHz;
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(lp);
    lp.connect(g);
    g.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  click() {
    this.blip(660, 0.08, 0.25, "square", -120);
  }

  wall(intensity: number) {
    const v = 0.12 + intensity * 0.35;
    this.blip(180 + intensity * 120, 0.12, v, "square", -90);
  }

  shipHit(intensity: number) {
    const v = 0.14 + intensity * 0.4;
    this.blip(320 + intensity * 260, 0.16, v, "triangle", 180);
    this.blip(90, 0.22, v * 0.6, "sine", -30);
  }

  goal() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const seq = [523.25, 659.25, 783.99, 1046.5];
    seq.forEach((f, i) => {
      this.note(f, t + i * 0.11, 0.9, 0.22, "triangle", this.sfxBus, 2);
    });
    this.blip(120, 0.5, 0.4, "sawtooth", 400);
  }

  whistle(final = false) {
    if (final) {
      const ctx = this.ctx;
      if (!ctx) return;
      const t = ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((f, i) =>
        this.note(f, t + i * 0.13, 1.2, 0.2, "square", this.sfxBus, 2)
      );
    } else {
      this.blip(880, 0.14, 0.2, "square", 60);
    }
  }
}

export const audio = new AudioManager();
