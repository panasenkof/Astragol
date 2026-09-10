import {
  BALL_DRAG,
  BALL_MAX_SPEED,
  BALL_R,
  CHARGE_MIN,
  CHARGE_TIME,
  FIELD_H,
  FIELD_W,
  GOAL_BOTTOM,
  GOAL_DEPTH,
  GOAL_TOP,
  SHIP_ACCEL,
  SHIP_DRAG,
  SHIP_MAX_SPEED,
  SHIP_R,
  SHIP_ROT_SPEED,
  WALL_REST,
} from "./constants";
import type { GameMode, Settings } from "./types";

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const norm = (a: number) => {
  a %= TAU;
  if (a < -Math.PI) a += TAU;
  if (a > Math.PI) a -= TAU;
  return a;
};

// Arena perimeter + goal frames expressed as collidable line segments for the
// ball. [x1, y1, x2, y2]. The goal mouths are gaps left between the perimeter
// segments; the net box behind each mouth is closed off so the ball is
// contained once it crosses the line.
const BALL_SEGMENTS: [number, number, number, number][] = [
  [0, 0, FIELD_W, 0], // arena top
  [0, FIELD_H, FIELD_W, FIELD_H], // arena bottom
  // left goal
  [0, 0, 0, GOAL_TOP],
  [0, GOAL_BOTTOM, 0, FIELD_H],
  [-GOAL_DEPTH, GOAL_TOP, -GOAL_DEPTH, GOAL_BOTTOM],
  [0, GOAL_TOP, -GOAL_DEPTH, GOAL_TOP],
  [0, GOAL_BOTTOM, -GOAL_DEPTH, GOAL_BOTTOM],
  // right goal
  [FIELD_W, 0, FIELD_W, GOAL_TOP],
  [FIELD_W, GOAL_BOTTOM, FIELD_W, FIELD_H],
  [FIELD_W + GOAL_DEPTH, GOAL_TOP, FIELD_W + GOAL_DEPTH, GOAL_BOTTOM],
  [FIELD_W, GOAL_TOP, FIELD_W + GOAL_DEPTH, GOAL_TOP],
  [FIELD_W, GOAL_BOTTOM, FIELD_W + GOAL_DEPTH, GOAL_BOTTOM],
];

export interface PadInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Absolute heading in field radians; when set, overrides left/right. */
  aimStick: number | null;
}
export const emptyPad = (): PadInput => ({
  left: false,
  right: false,
  up: false,
  down: false,
  aimStick: null,
});
export interface InputState {
  p1: PadInput;
  p2: PadInput;
}

export type GameEvent =
  | { type: "wall"; intensity: number; x: number; y: number }
  | { type: "hit"; intensity: number; x: number; y: number }
  | { type: "goal"; scorer: 0 | 1 }
  | { type: "countdown"; final: boolean }
  | { type: "matchEnd"; winner: 0 | 1 };

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  m: number;
}

interface Ship extends Body {
  id: 0 | 1;
  aim: number;
  color: string;
  upCharge: number;
  downCharge: number;
  thrust: number;
  ai: boolean;
  trail: number[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  drag: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  layer: number;
  ph: number;
}

export interface Viewport {
  scale: number;
  ox: number;
  oy: number;
  cx: number;
  cy: number;
  rotate: number;
  w: number;
  h: number;
  dpr: number;
}

export class Game {
  ships: [Ship, Ship];
  ball: Body;
  particles: Particle[] = [];
  stars: Star[] = [];
  shake = 0;
  flash = 0;
  time = 0;
  phase: "countdown" | "play" | "scored" | "over" = "countdown";
  phaseT = 3;
  lastCount = 4;
  elapsed = 0;
  matchTime = 0;
  scores: [number, number] = [0, 0];
  goalPulse: [number, number] = [0, 0];
  lastScorer: 0 | 1 = 0;
  winner: 0 | 1 = 0;
  targetScore: number;
  settings: Settings;
  mode: GameMode;
  input: InputState = { p1: emptyPad(), p2: emptyPad() };
  onEvent?: (e: GameEvent) => void;
  aiSkill = 0.75;
  /** Seconds the AI has been pinning a slow ball into a corner. */
  private aiStuckT = 0;

  constructor(settings: Settings, mode: GameMode, targetScore: number) {
    this.settings = settings;
    this.mode = mode;
    this.targetScore = targetScore;

    this.ships = [this.makeShip(0), this.makeShip(1)];
    this.ball = {
      x: FIELD_W / 2,
      y: FIELD_H / 2,
      vx: 0,
      vy: 0,
      r: BALL_R,
      m: settings.ballWeight,
    };

    for (let i = 0; i < 170; i++) {
      const layer = i % 3;
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.4 + Math.random() * (1 - layer * 0.22),
        a: 0.25 + Math.random() * 0.6,
        layer,
        ph: Math.random() * TAU,
      });
    }
    this.resetPositions();
  }

  applySettings(s: Settings) {
    this.settings = s;
    this.ships[0].color = s.p1Color;
    this.ships[1].color = s.p2Color;
    this.ships[0].m = s.shipWeight;
    this.ships[1].m = s.shipWeight;
    this.ball.m = s.ballWeight;
  }

  private makeShip(id: 0 | 1): Ship {
    return {
      id,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: SHIP_R,
      m: this.settings ? this.settings.shipWeight : 3.2,
      aim: id === 0 ? 0 : Math.PI,
      color: "",
      upCharge: 0,
      downCharge: 0,
      thrust: 0,
      ai: this.mode === "1p" && id === 1,
      trail: [],
    };
  }

  resetPositions() {
    const [s0, s1] = this.ships;
    s0.x = FIELD_W * 0.24;
    s0.y = FIELD_H * 0.37;
    s0.vx = s0.vy = 0;
    s0.aim = 0;
    s0.trail = [];
    s1.x = FIELD_W * 0.76;
    s1.y = FIELD_H * 0.37;
    s1.vx = s1.vy = 0;
    s1.aim = Math.PI;
    s1.trail = [];
    this.ball.x = FIELD_W / 2;
    this.ball.y = FIELD_H / 2;
    this.ball.vx = this.ball.vy = 0;
    this.aiStuckT = 0;
    this.ships[0].color = this.settings.p1Color;
    this.ships[1].color = this.settings.p2Color;
    this.ships[0].ai = false;
    this.ships[1].ai = this.mode === "1p";
    this.ships[0].m = this.settings.shipWeight;
    this.ships[1].m = this.settings.shipWeight;
    this.ball.m = this.settings.ballWeight;
  }

  newRound() {
    this.resetPositions();
    this.phase = "countdown";
    this.phaseT = 3;
    this.lastCount = 4;
    this.elapsed = 0;
  }

  reset() {
    this.scores = [0, 0];
    this.matchTime = 0;
    this.particles.length = 0;
    this.shake = 0;
    this.flash = 0;
    this.newRound();
  }

  // ------------------------------------------------------------------ update
  update(dt: number) {
    dt = Math.min(dt, 1 / 30);
    this.time += dt;
    this.shake *= Math.exp(-9 * dt);
    if (this.shake < 0.15) this.shake = 0;
    this.flash *= Math.exp(-4.5 * dt);
    this.goalPulse[0] *= Math.exp(-3.2 * dt);
    this.goalPulse[1] *= Math.exp(-3.2 * dt);
    this.updateParticles(dt);

    if (this.phase === "countdown") {
      this.phaseT -= dt;
      const remaining = Math.ceil(this.phaseT);
      if (remaining !== this.lastCount && remaining >= 1 && remaining <= 3) {
        this.lastCount = remaining;
        this.onEvent?.({ type: "countdown", final: false });
      }
      if (this.phaseT <= 0) {
        this.phase = "play";
        this.elapsed = 0;
        this.onEvent?.({ type: "countdown", final: true });
      }
    } else if (this.phase === "play") {
      this.elapsed += dt;
      this.matchTime += dt;
      this.stepShips(dt);
      this.stepBall(dt);
      this.collide();
      this.checkGoals();
    } else if (this.phase === "scored") {
      this.phaseT -= dt;
      this.stepShips(dt);
      if (this.phaseT <= 0) this.afterGoal();
    }
    // 'over' -> nothing moves
  }

  private afterGoal() {
    if (
      this.scores[0] >= this.targetScore ||
      this.scores[1] >= this.targetScore
    ) {
      this.phase = "over";
      this.winner = this.scores[0] > this.scores[1] ? 0 : 1;
      this.onEvent?.({ type: "matchEnd", winner: this.winner });
    } else {
      this.newRound();
    }
  }

  // ------------------------------------------------------------------ ships
  private stepShips(dt: number) {
    for (const ship of this.ships) {
      const pad = ship.ai ? this.aiPad(ship, dt) : this.padFor(ship.id);

      if (pad.aimStick != null) {
        ship.aim = pad.aimStick;
      } else {
        if (pad.left) ship.aim -= SHIP_ROT_SPEED * dt;
        if (pad.right) ship.aim += SHIP_ROT_SPEED * dt;
      }
      ship.aim = norm(ship.aim);

      const rate = dt / CHARGE_TIME;
      ship.upCharge = pad.up
        ? clamp(ship.upCharge + rate, 0, 1)
        : Math.max(0, ship.upCharge - rate * 4);
      ship.downCharge =
        pad.down && !this.settings.downDisabled
          ? clamp(ship.downCharge + rate, 0, 1)
          : Math.max(0, ship.downCharge - rate * 4);

      let thrust = 0;
      if (pad.up) thrust += CHARGE_MIN + (1 - CHARGE_MIN) * ship.upCharge;
      if (pad.down && !this.settings.downDisabled)
        thrust -= CHARGE_MIN + (1 - CHARGE_MIN) * ship.downCharge;
      ship.thrust = Math.abs(thrust);

      if (thrust !== 0) {
        ship.vx += Math.cos(ship.aim) * thrust * SHIP_ACCEL * dt;
        ship.vy += Math.sin(ship.aim) * thrust * SHIP_ACCEL * dt;
      }

      const damp = Math.exp(-SHIP_DRAG * dt);
      ship.vx *= damp;
      ship.vy *= damp;
      this.capSpeed(ship, SHIP_MAX_SPEED);

      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;

      this.wallClamp(ship);

      // exhaust juice
      if (ship.thrust > 0.15 && Math.random() < 0.6) {
        const bx = ship.x - Math.cos(ship.aim) * (SHIP_R + 4);
        const by = ship.y - Math.sin(ship.aim) * (SHIP_R + 4);
        this.spawnParticle(
          bx + rand(-4, 4),
          by + rand(-4, 4),
          rand(-20, 20) - Math.cos(ship.aim) * rand(30, 90),
          rand(-20, 20) - Math.sin(ship.aim) * rand(30, 90),
          ship.color,
          ship.id === 0 ? 1 : -1,
          rand(2, 5),
          rand(0.2, 0.42)
        );
      }

      // trail
      ship.trail.push(ship.x, ship.y);
      if (ship.trail.length > 26) ship.trail.splice(0, 2);
    }
  }

  private padFor(id: 0 | 1): PadInput {
    return id === 0 ? this.input.p1 : this.input.p2;
  }

  /**
   * Which field corner the ball is pocketed in, if any.
   * x: -1 left / 1 right; y: -1 top / 1 bottom.
   */
  private ballCorner(): { x: number; y: number } | null {
    const b = this.ball;
    const z = b.r + 36;
    const x = b.x < z ? -1 : b.x > FIELD_W - z ? 1 : 0;
    const y = b.y < z ? -1 : b.y > FIELD_H - z ? 1 : 0;
    if (!x || !y) return null;
    return { x, y };
  }

  private aiPad(ship: Ship, dt: number): PadInput {
    const ball = this.ball;
    const attackDir = -1; // AI is always player 2 -> attacks the left goal
    const contact = SHIP_R + BALL_R;
    const dToBall = Math.hypot(ball.x - ship.x, ball.y - ship.y);
    const corner = this.ballCorner();
    const ballSp = Math.hypot(ball.vx, ball.vy);

    if (corner && dToBall < contact + 28 && ballSp < 110) {
      this.aiStuckT += dt;
    } else {
      this.aiStuckT = Math.max(0, this.aiStuckT - dt * 2);
    }

    let tx: number;
    let ty: number;
    let reverse = false;

    if (corner) {
      if (this.aiStuckT > 0.16) {
        reverse = true;
        tx = ball.x;
        ty = ball.y;
      } else {
        // Nudge the aim off the exact corner diagonal so the strike
        // has a glancing component; still close enough to make contact.
        tx = ball.x - corner.x * 6;
        ty = ball.y - corner.y * 20;
      }
    } else if (dToBall < contact + 32) {
      tx = ball.x;
      ty = ball.y;
    } else {
      const px = ball.x + ball.vx * 0.13;
      const py = ball.y + ball.vy * 0.13;
      tx = px - attackDir * (contact + 4);
      ty = py + Math.sin(this.time * 1.6) * 14;
    }

    let desired: number;
    if (reverse) {
      // Face the ball and reverse to create space, then re-approach.
      desired = Math.atan2(ball.y - ship.y, ball.x - ship.x);
    } else {
      desired = Math.atan2(ty - ship.y, tx - ship.x);
    }
    if (reverse && this.settings.downDisabled) {
      desired = norm(desired + Math.PI);
      reverse = false;
    }
    if (!corner) desired += rand(-1, 1) * (1 - this.aiSkill) * 0.5;
    const diff = norm(desired - ship.aim);
    const nearBall = dToBall < contact + 32;
    const dTarget = Math.hypot(tx - ship.x, ty - ship.y);
    const aimed = Math.abs(diff) < 0.6;
    return {
      left: diff < -0.14,
      right: diff > 0.14,
      up: !reverse && aimed && (nearBall || dTarget > 36 || !!corner),
      down: reverse && Math.abs(diff) < 1.2,
      aimStick: null,
    };
  }

  private capSpeed(b: Body, max: number) {
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > max) {
      const k = max / sp;
      b.vx *= k;
      b.vy *= k;
    }
  }

  // ------------------------------------------------------------------- ball
  private stepBall(dt: number) {
    const b = this.ball;
    const damp = Math.exp(-BALL_DRAG * dt);
    b.vx *= damp;
    b.vy *= damp;
    this.capSpeed(b, BALL_MAX_SPEED);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    for (const s of BALL_SEGMENTS) {
      this.resolveSegment(b, s[0], s[1], s[2], s[3], WALL_REST);
    }
  }

  /**
   * Circle-vs-segment collision. Handles the arena perimeter, the goal posts
   * and the goal nets with a single robust routine (no corner teleporting).
   */
  private resolveSegment(
    b: Body,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    e: number
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((b.x - x1) * dx + (b.y - y1) * dy) / len2;
    t = clamp(t, 0, 1);
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    let nx = b.x - cx;
    let ny = b.y - cy;
    let d = Math.hypot(nx, ny);
    if (d >= b.r) return;
    if (d < 0.0001) {
      nx = 0;
      ny = -1;
      d = 0.0001;
    } else {
      nx /= d;
      ny /= d;
    }
    const pen = b.r - d;
    b.x += nx * pen;
    b.y += ny * pen;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + e) * vn * nx;
      b.vy -= (1 + e) * vn * ny;
      this.wallFx(b, nx, ny);
    }
  }

  // ---------------------------------------------------------------- physics
  /** Ships bounce off the full solid perimeter (goal mouths included). */
  private wallClamp(b: Body) {
    const e = WALL_REST;
    if (b.y - b.r < 0) {
      b.y = b.r;
      if (b.vy < 0) b.vy = -b.vy * e;
    }
    if (b.y + b.r > FIELD_H) {
      b.y = FIELD_H - b.r;
      if (b.vy > 0) b.vy = -b.vy * e;
    }
    if (b.x - b.r < 0) {
      b.x = b.r;
      if (b.vx < 0) b.vx = -b.vx * e;
    }
    if (b.x + b.r > FIELD_W) {
      b.x = FIELD_W - b.r;
      if (b.vx > 0) b.vx = -b.vx * e;
    }
  }

  private wallFx(b: Body, nx: number, ny: number) {
    const speed = Math.hypot(b.vx, b.vy);
    const intensity = clamp(speed / 700, 0, 1);
    if (intensity < 0.06) return;
    this.onEvent?.({ type: "wall", intensity, x: b.x, y: b.y });
    this.shake = Math.max(this.shake, intensity * 7);
    const cx = b.x - nx * b.r;
    const cy = b.y - ny * b.r;
    const n = Math.round(3 + intensity * 10);
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(-ny, -nx) + rand(-1.1, 1.1);
      const sp = rand(60, 200) * (0.4 + intensity);
      this.spawnParticle(
        cx,
        cy,
        Math.cos(a) * sp,
        Math.sin(a) * sp,
        "#bfe9ff",
        0,
        rand(1.5, 3.5),
        rand(0.2, 0.5)
      );
    }
  }

  private collide() {
    const [s0, s1] = this.ships;
    // ship vs ball
    this.resolve(s0, this.ball, this.settings.restitution, true);
    this.resolve(s1, this.ball, this.settings.restitution, true);
    // ship vs ship
    this.resolve(s0, s1, this.settings.restitution * 0.92, false);
  }

  /** Elastic collision response. Returns the impulse magnitude. */
  private resolve(a: Body, b: Body, e: number, isShipBall: boolean): number {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let d = Math.hypot(dx, dy);
    const min = a.r + b.r;
    if (d >= min) return 0;
    if (d < 0.0001) {
      dx = 1;
      dy = 0;
      d = 0.0001;
    }
    const nx = dx / d;
    const ny = dy / d;
    const overlap = min - d;
    const invA = 1 / a.m;
    const invB = 1 / b.m;
    const invSum = invA + invB;

    a.x -= nx * overlap * (invA / invSum);
    a.y -= ny * overlap * (invA / invSum);
    b.x += nx * overlap * (invB / invSum);
    b.y += ny * overlap * (invB / invSum);

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const vn = rvx * nx + rvy * ny;
    if (vn > 0) return 0;

    const j = (-(1 + e) * vn) / invSum;
    a.vx -= j * nx * invA;
    a.vy -= j * ny * invA;
    b.vx += j * nx * invB;
    b.vy += j * ny * invB;

    if (isShipBall) {
      const pocket = this.ballCorner();
      if (pocket) {
        const into = b.vx * pocket.x + b.vy * pocket.y;
        if (into > 0) {
          const el2 = pocket.x * pocket.x + pocket.y * pocket.y;
          b.vx -= (pocket.x * into) / el2;
          b.vy -= (pocket.y * into) / el2;
        }
        const el = Math.hypot(pocket.x, pocket.y);
        const pop = Math.max(160, Math.abs(j) * invB * 0.35);
        b.vx -= (pocket.x / el) * pop;
        b.vy -= (pocket.y / el) * pop;
      }

      const intensity = clamp(j / 620, 0, 1);
      if (intensity > 0.05) {
        const px = a.x + nx * a.r;
        const py = a.y + ny * a.r;
        const ship = a as Ship;
        this.onEvent?.({ type: "hit", intensity, x: px, y: py });
        this.shake = Math.max(this.shake, intensity * 16);
        const n = Math.round(4 + intensity * 16);
        for (let i = 0; i < n; i++) {
          const ang = Math.atan2(ny, nx) + rand(-1.2, 1.2);
          const sp = rand(70, 240) * (0.4 + intensity * 1.4);
          this.spawnParticle(
            px,
            py,
            Math.cos(ang) * sp,
            Math.sin(ang) * sp,
            i % 3 === 0 ? "#ffffff" : ship.color,
            0,
            rand(1.5, 4),
            rand(0.2, 0.55)
          );
        }
      }
    }
    return Math.abs(j);
  }

  private checkGoals() {
    const b = this.ball;
    if (b.x < -b.r && b.y > GOAL_TOP && b.y < GOAL_BOTTOM) {
      b.x = -b.r;
      this.score(1);
    } else if (b.x > FIELD_W + b.r && b.y > GOAL_TOP && b.y < GOAL_BOTTOM) {
      b.x = FIELD_W + b.r;
      this.score(0);
    }
    // safety: never let the ball escape the goal boxes
    if (b.x < -GOAL_DEPTH + b.r) {
      b.x = -GOAL_DEPTH + b.r;
      b.vx = Math.abs(b.vx) * 0.3;
    } else if (b.x > FIELD_W + GOAL_DEPTH - b.r) {
      b.x = FIELD_W + GOAL_DEPTH - b.r;
      b.vx = -Math.abs(b.vx) * 0.3;
    }
  }

  private score(scorer: 0 | 1) {
    this.scores[scorer]++;
    this.goalPulse[scorer] = 1;
    this.lastScorer = scorer;
    this.shake = 30;
    this.flash = 0.85;
    this.phase = "scored";
    this.phaseT = 1.7;
    const color = this.ships[scorer].color;
    const gx = scorer === 0 ? FIELD_W : 0;
    this.ball.vx = this.ball.vy = 0;
    this.onEvent?.({ type: "goal", scorer });
    for (let i = 0; i < 90; i++) {
      const a = rand(0, TAU);
      const sp = rand(60, 520);
      this.spawnParticle(
        this.ball.x,
        this.ball.y,
        Math.cos(a) * sp,
        Math.sin(a) * sp,
        i % 4 === 0 ? "#ffffff" : color,
        0,
        rand(2, 6),
        rand(0.5, 1.2)
      );
    }
    void gx;
  }

  // ------------------------------------------------------------- particles
  spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    _dir: number,
    size: number,
    life: number,
    drag = 2.4
  ) {
    if (this.particles.length > 460) this.particles.shift();
    this.particles.push({
      x,
      y,
      vx,
      vy,
      life,
      max: life,
      size,
      color,
      drag,
    });
  }

  private updateParticles(dt: number) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) {
        ps.splice(i, 1);
        continue;
      }
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  // --------------------------------------------------------------- render
  render(ctx: CanvasRenderingContext2D, view: Viewport) {
    const { scale, w, h } = view;
    this.drawBackground(ctx, view);

    const sx = this.shake ? rand(-this.shake, this.shake) : 0;
    const sy = this.shake ? rand(-this.shake, this.shake) : 0;

    ctx.save();
    ctx.translate(view.cx + sx, view.cy + sy);
    if (view.rotate) ctx.rotate(view.rotate);
    ctx.scale(scale, scale);
    ctx.translate(-FIELD_W / 2, -FIELD_H / 2);

    this.drawArena(ctx);
    this.drawGoals(ctx);
    this.drawParticles(ctx);
    this.drawBall(ctx);
    this.drawShips(ctx);

    ctx.restore();

    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(190,230,255,${this.flash * 0.42})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private bgCache: HTMLCanvasElement | null = null;
  private bgKey = "";

  private drawBackground(ctx: CanvasRenderingContext2D, view: Viewport) {
    const { w, h, dpr } = view;

    // Slow changing parts (gradient + nebula) are baked once into an offscreen
    // canvas so we don't rebuild several full-screen gradients every frame.
    const key = `${Math.round(w)}x${Math.round(h)}@${dpr}`;
    if (!this.bgCache || this.bgKey !== key) {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.floor(w * dpr));
      c.height = Math.max(1, Math.floor(h * dpr));
      const cc = c.getContext("2d");
      if (cc) {
        cc.scale(dpr, dpr);
        const g = cc.createLinearGradient(0, 0, w * 0.4, h);
        g.addColorStop(0, "#05030f");
        g.addColorStop(0.55, "#0a0724");
        g.addColorStop(1, "#05030f");
        cc.fillStyle = g;
        cc.fillRect(0, 0, w, h);

        cc.globalCompositeOperation = "lighter";
        const blobs: [number, number, number, string][] = [
          [0.22, 0.28, 0.42, "rgba(88,60,200,0.5)"],
          [0.82, 0.72, 0.4, "rgba(30,140,180,0.42)"],
          [0.6, 0.16, 0.3, "rgba(150,50,140,0.32)"],
          [0.12, 0.85, 0.34, "rgba(40,90,190,0.3)"],
        ];
        for (const [bx, by, br, col] of blobs) {
          const rr = Math.min(w, h) * br;
          const rg = cc.createRadialGradient(
            bx * w,
            by * h,
            0,
            bx * w,
            by * h,
            rr
          );
          rg.addColorStop(0, col);
          rg.addColorStop(1, "rgba(0,0,0,0)");
          cc.fillStyle = rg;
          cc.fillRect(0, 0, w, h);
        }
        this.bgCache = c;
        this.bgKey = key;
      }
    }

    if (this.bgCache) ctx.drawImage(this.bgCache, 0, 0, w, h);

    // twinkling stars drawn live on top (cheap circles)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s of this.stars) {
      const tw = 0.55 + 0.45 * Math.sin(this.time * (0.7 + s.layer * 0.4) + s.ph);
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = s.layer === 2 ? "#cfe6ff" : "#ffffff";
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawArena(ctx: CanvasRenderingContext2D) {
    // inner glass fill
    const g = ctx.createLinearGradient(0, 0, 0, FIELD_H);
    g.addColorStop(0, "rgba(90,140,255,0.06)");
    g.addColorStop(1, "rgba(60,40,140,0.05)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    // midline + center circle
    ctx.save();
    ctx.strokeStyle = "rgba(130,210,255,0.24)";
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 16]);
    ctx.beginPath();
    ctx.moveTo(FIELD_W / 2, 6);
    ctx.lineTo(FIELD_W / 2, FIELD_H - 6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(FIELD_W / 2, FIELD_H / 2, 96, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(FIELD_W / 2, FIELD_H / 2, 5, 0, TAU);
    ctx.fillStyle = "rgba(150,220,255,0.4)";
    ctx.fill();
    ctx.restore();

    // perimeter glow border
    ctx.save();
    ctx.shadowColor = "rgba(90,180,255,0.85)";
    ctx.shadowBlur = 22;
    ctx.strokeStyle = "rgba(150,215,255,0.75)";
    ctx.lineWidth = 5;
    ctx.strokeRect(2.5, 2.5, FIELD_W - 5, FIELD_H - 5);
    ctx.strokeStyle = "rgba(210,240,255,0.5)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(2.5, 2.5, FIELD_W - 5, FIELD_H - 5);
    ctx.restore();
  }

  private drawGoals(ctx: CanvasRenderingContext2D) {
    const left = this.ships[0].color;
    const right = this.ships[1].color;
    this.drawGoal(ctx, "left", left, this.goalPulse[1]);
    this.drawGoal(ctx, "right", right, this.goalPulse[0]);
  }

  private drawGoal(
    ctx: CanvasRenderingContext2D,
    side: "left" | "right",
    color: string,
    pulse: number
  ) {
    const x0 = side === "left" ? -GOAL_DEPTH : FIELD_W;
    const top = GOAL_TOP;
    const hgt = GOAL_BOTTOM - GOAL_TOP;
    ctx.save();
    ctx.fillStyle = "rgba(4,6,20,0.75)";
    ctx.fillRect(x0, top, GOAL_DEPTH, hgt);

    // net
    ctx.strokeStyle = this.hexA(color, 0.22 + pulse * 0.4);
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const gx = x0 + (GOAL_DEPTH / 6) * i;
      ctx.beginPath();
      ctx.moveTo(gx, top);
      ctx.lineTo(gx, top + hgt);
      ctx.stroke();
    }
    for (let i = 1; i < 5; i++) {
      const gy = top + (hgt / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x0, gy);
      ctx.lineTo(x0 + GOAL_DEPTH, gy);
      ctx.stroke();
    }

    ctx.shadowColor = color;
    ctx.shadowBlur = 22 + pulse * 40;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 + pulse * 4;
    ctx.globalAlpha = 0.7 + pulse * 0.3;
    ctx.strokeRect(x0 + 2, top, GOAL_DEPTH - 4, hgt);
    ctx.restore();

    // posts
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    for (const py of [top, GOAL_BOTTOM]) {
      ctx.beginPath();
      ctx.arc(side === "left" ? 0 : FIELD_W, py, 6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    if (!this.particles.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      const t = p.life / p.max;
      ctx.globalAlpha = clamp(t, 0, 1) * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + t * 0.8), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBall(ctx: CanvasRenderingContext2D) {
    const b = this.ball;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 3.4);
    glow.addColorStop(0, "rgba(190,220,255,0.5)");
    glow.addColorStop(1, "rgba(120,180,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 3.4, 0, TAU);
    ctx.fill();
    ctx.restore();

    const grad = ctx.createRadialGradient(
      b.x - b.r * 0.4,
      b.y - b.r * 0.45,
      b.r * 0.15,
      b.x,
      b.y,
      b.r * 1.15
    );
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.28, "#cfd8e6");
    grad.addColorStop(0.62, "#8794a8");
    grad.addColorStop(0.85, "#4d576b");
    grad.addColorStop(1, "#232a3a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fill();

    // rotating sheen band
    ctx.save();
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.clip();
    const ang = this.time * 1.2;
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = b.r * 0.5;
    ctx.beginPath();
    ctx.arc(
      b.x,
      b.y,
      b.r * 0.9,
      ang,
      ang + 0.7
    );
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.stroke();
  }

  private drawShips(ctx: CanvasRenderingContext2D) {
    for (const s of this.ships) {
      // trail
      if (s.trail.length >= 4) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < s.trail.length; i += 2) {
          const t = i / s.trail.length;
          ctx.globalAlpha = t * 0.28;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.trail[i], s.trail[i + 1], SHIP_R * 0.5 * t, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }

      // soft glow
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const glowR = SHIP_R * (2.5 + s.thrust * 0.5);
      const gg = ctx.createRadialGradient(s.x, s.y, SHIP_R * 0.3, s.x, s.y, glowR);
      gg.addColorStop(0, this.hexA(s.color, 0.75));
      gg.addColorStop(0.35, this.hexA(s.color, 0.4));
      gg.addColorStop(1, this.hexA(s.color, 0));
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(s.x, s.y, glowR, 0, TAU);
      ctx.fill();
      ctx.restore();

      // body
      const bg = ctx.createRadialGradient(
        s.x - SHIP_R * 0.35,
        s.y - SHIP_R * 0.4,
        SHIP_R * 0.1,
        s.x,
        s.y,
        SHIP_R
      );
      bg.addColorStop(0, this.lighten(s.color, 0.55));
      bg.addColorStop(0.55, s.color);
      bg.addColorStop(1, this.darken(s.color, 0.55));
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // core highlight
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.x - SHIP_R * 0.32, s.y - SHIP_R * 0.34, SHIP_R * 0.24, 0, TAU);
      ctx.fill();
      ctx.restore();

      // aim arrow riding the perimeter
      ctx.save();
      const ar = SHIP_R + 12;
      const ax = s.x + Math.cos(s.aim) * ar;
      const ay = s.y + Math.sin(s.aim) * ar;
      ctx.translate(ax, ay);
      ctx.rotate(s.aim);
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(-6, -7);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // charge ring
      const charge = Math.max(s.upCharge, s.downCharge);
      if (charge > 0.03) {
        ctx.save();
        ctx.strokeStyle = this.hexA(s.color, 0.9);
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(
          s.x,
          s.y,
          SHIP_R + 7,
          -Math.PI / 2,
          -Math.PI / 2 + TAU * charge
        );
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ------------------------------------------------------------- color utils
  private hexA(hex: string, a: number) {
    const c = this.parse(hex);
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  private lighten(hex: string, t: number) {
    const c = this.parse(hex);
    return `rgb(${Math.round(c[0] + (255 - c[0]) * t)},${Math.round(
      c[1] + (255 - c[1]) * t
    )},${Math.round(c[2] + (255 - c[2]) * t)})`;
  }
  private darken(hex: string, t: number) {
    const c = this.parse(hex);
    return `rgb(${Math.round(c[0] * (1 - t))},${Math.round(
      c[1] * (1 - t)
    )},${Math.round(c[2] * (1 - t))})`;
  }
  private parse(hex: string): [number, number, number] {
    let h = hex.replace("#", "");
    if (h.length === 3)
      h = h
        .split("")
        .map((ch) => ch + ch)
        .join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
}
