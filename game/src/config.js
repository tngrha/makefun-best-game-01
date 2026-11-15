// EMBERFALL — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720, centreX: 640, centreY: 360 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The ember grove at the middle of the arena: the thing you guard. */
export const GROVE = { x: 640, y: 360, radius: 74 };

export const PLAYER = {
  radius: 16,
  speed: 330,
  maxHearts: 3,
  fireInterval: 0.22,
  bulletSpeed: 620,
  bulletDamage: 1,
  bulletRange: 520,
  magnetRadius: 90,
  dashCooldown: 2.4,
  dashTime: 0.16,
  dashSpeed: 980,
  invulnerable: 1.2,
};

/** Enemy kinds. hp grows a little every wave; speed and size are per kind. */
export const ENEMY_KINDS = {
  cinder: { name: 'Cinder', radius: 15, speed: 95, hp: 2, damage: 1, score: 50, shard: 1, colour: '#b8452e' },
  wisp: { name: 'Wisp', radius: 11, speed: 185, hp: 1, damage: 1, score: 75, shard: 1, colour: '#7fe0d4' },
  brute: { name: 'Brute', radius: 26, speed: 58, hp: 8, damage: 2, score: 150, shard: 3, colour: '#8a5a2e' },
  spitter: { name: 'Spitter', radius: 14, speed: 80, hp: 3, damage: 1, score: 120, shard: 2, colour: '#a86fd6' },
};

/** Which kinds may appear, by wave: the mix widens as the night goes on. */
export function kindsForWave(wave) {
  if (wave <= 1) return ['cinder'];
  if (wave === 2) return ['cinder', 'wisp'];
  if (wave === 3) return ['cinder', 'wisp', 'spitter'];
  return ['cinder', 'wisp', 'spitter', 'brute'];
}

/** How many hollows a wave sends, and how fast they arrive. */
export function wavePlan(wave) {
  return {
    total: 6 + wave * 4,
    interval: Math.max(0.35, 1.15 - wave * 0.09),
    hpBonus: Math.floor((wave - 1) / 3),
  };
}

export const SHARD = { radius: 9, value: 10, magnetSpeed: 420, lifetime: 14 };

export const COMBO = { window: 4, step: 0.25, cap: 4 };

/** A wave is won when every hollow is gone; the grove heals a heart every 3rd wave. */
export const WAVE_CLEAR_HEAL_EVERY = 3;

export const PALETTE = {
  backdrop: '#0b1410',
  groundA: '#12241c',
  groundB: '#0a1712',
  groveGlow: '#ff9a3c',
  groveLeaf: '#2e7d5b',
  groveTrunk: '#5a3a22',
  player: '#ffb347',
  playerCore: '#fff3d6',
  bullet: '#ffc46b',
  shard: '#ffcf5e',
  enemyEye: '#ffd9a0',
  panel: '#101d17',
  panelEdge: '#2e5d49',
  text: '#f4ead8',
  muted: '#9db8a6',
  danger: '#ff5a4e',
  heal: '#7fe0a8',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberfall.best';
