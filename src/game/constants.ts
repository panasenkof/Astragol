// ---------------------------------------------------------------------------
// Core field geometry & physics tuning. All gameplay happens in a fixed
// "virtual field" coordinate space (1000 x 640) that is scaled to fit the
// screen. This keeps physics identical on every device / aspect ratio.
// ---------------------------------------------------------------------------

export const FIELD_W = 1000;
export const FIELD_H = 640;

export const SHIP_R = 33;
export const BALL_R = 16;

// Goal mouth (opening) on the left & right walls.
export const GOAL_H = 188;
export const GOAL_DEPTH = 62;
export const GOAL_TOP = (FIELD_H - GOAL_H) / 2;
export const GOAL_BOTTOM = (FIELD_H + GOAL_H) / 2;

// Restitution used when bodies bounce off the solid arena perimeter.
export const WALL_REST = 0.84;

export const SHIP_MAX_SPEED = 545;
export const BALL_MAX_SPEED = 1000;

export const SHIP_ACCEL = 1560; // px/s^2 at full charge
export const SHIP_DRAG = 0.8; // exponential drag (per second)
export const BALL_DRAG = 0.1;
export const SHIP_ROT_SPEED = 3.5; // rad/s the aim arrow rotates
export const CHARGE_TIME = 0.6; // seconds to reach full thrust charge
export const CHARGE_MIN = 0.3; // starting thrust multiplier

export const TARGET_SCORE = 5; // first to N goals wins the match

export const STORAGE_SETTINGS = "nebula-arena:settings:v1";
export const STORAGE_SCORES = "nebula-arena:scores:v1";

export const DEFAULT_P1_COLOR = "#38bdf8"; // cyan / blue
export const DEFAULT_P2_COLOR = "#fb5a4b"; // red
