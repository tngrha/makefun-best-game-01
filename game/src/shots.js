// The screenshot scenes behind ?shot=title|play|upgrade|over. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (chase the nearest shard, then the nearest hollow, keep
// firing at it, dash away from trouble), so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_UPGRADE } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';

const TITLE_SECONDS = 6;
const PLAY_SECONDS = 8;
const OVER_LIMIT_SECONDS = 600;
const UPGRADE_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Distance from `point` to the nearest enemy; Infinity when none are near. */
function nearestEnemyDistance(state, x, y) {
  let best = Infinity;
  for (const enemy of state.enemies) {
    const d = Math.hypot(enemy.x - x, enemy.y - y);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Steer the keeper: toward the nearest shard when one is close, else toward the
 * nearest hollow but never inside its touch range; `brave` false makes the
 * pilot wander instead of fighting, so the over scene ends in defeat.
 */
function autopilot(state, brave) {
  const player = state.player;
  let target = null;
  if (brave) {
    let bestShard = null;
    let bestShardD = 170;
    for (const shard of state.shardsList) {
      const d = Math.hypot(shard.x - player.x, shard.y - player.y);
      if (d < bestShardD) {
        bestShardD = d;
        bestShard = shard;
      }
    }
    if (bestShard) target = bestShard;
  }
  let enemy = null;
  let enemyD = Infinity;
  for (const candidate of state.enemies) {
    const d = Math.hypot(candidate.x - player.x, candidate.y - player.y);
    if (d < enemyD) {
      enemyD = d;
      enemy = candidate;
    }
  }
  if (!target && enemy) {
    // Hold a firing distance of about 220: close in when far, back off when close.
    if (enemyD > 260) target = enemy;
    else if (enemyD < 130) target = { x: player.x * 2 - enemy.x, y: player.y * 2 - enemy.y };
    else target = { x: player.x, y: player.y };
  }
  if (!target) target = { x: FIELD.width / 2, y: FIELD.height / 2 + 170 };
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const length = Math.hypot(dx, dy) || 1;
  const moveX = length > 12 ? dx / length : 0;
  const moveY = length > 12 ? dy / length : 0;
  const aim = enemy ? { x: enemy.x, y: enemy.y } : { x: player.x, y: player.y - 100 };
  const crowded = nearestEnemyDistance(state, player.x, player.y) < 90;
  return { moveX, moveY, aimX: aim.x, aimY: aim.y, firing: brave, dash: brave && crowded };
}

/** Run the world forward one step with the autopilot's controls. */
function pilotStep(world, brave) {
  const state = world.state;
  const controls = autopilot(state, brave);
  return world.step(STEP, controls.moveX, controls.moveY, controls.aimX, controls.aimY, controls.firing, controls.dash);
}

/**
 * Set `world` to the named scene (title, play, upgrade or over; any other name
 * is title) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'upgrade' && name !== 'over') {
    for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) world.step(STEP, 0, 0, 0, 0, false, false);
    return { screen: SCREEN_TITLE, best: 1240 };
  }
  world.startRun();
  const limit = name === 'play' ? PLAY_SECONDS : name === 'upgrade' ? UPGRADE_LIMIT_SECONDS : OVER_LIMIT_SECONDS;
  // The over scene fights well first (so the final score is a real one), then
  // stops shooting from wave 2 on and is overrun; upgrade cards it meets on
  // the way are taken so the waves keep coming.
  let brave = true;
  let events = 0;
  for (let index = 0; index < limit / STEP; index += 1) {
    if (world.state.phase === 'upgrade') {
      if (name === 'upgrade') break;
      if (name === 'over') world.chooseUpgrade(0);
    }
    if (name === 'over' && world.state.wave >= 2) brave = false;
    events = pilotStep(world, brave);
    if (name === 'play' && index > PLAY_SECONDS / STEP) break;
    if (name === 'upgrade' && (events & EVENT_UPGRADE)) break;
    if (name === 'over' && (events & EVENT_OVER)) break;
    if (world.state.phase === 'over' && name !== 'over') break;
  }
  if (name === 'upgrade') return { screen: SCREEN_UPGRADE, best: world.state.score };
  if (world.state.phase === 'over') return { screen: SCREEN_OVER, best: world.state.score };
  return { screen: SCREEN_PLAY, best: world.state.score };
}
