// The whole game state and its rules: the keeper, the hollows, the bolts, the
// shards, the waves and the score. Nothing here touches the screen or the
// keyboard: main.js feeds it input and render.js paints what it holds, so the
// same step function drives live play and the deterministic screenshot scenes.
// A step returns a bitmask of events so main.js knows which sound to play.
import { COMBO, ENEMY_KINDS, FIELD, GROVE, PLAYER, SHARD, STEP, kindsForWave, wavePlan } from './config.js';
import { drawUpgrades } from './upgrades.js';

export const EVENT_SHOOT = 1;
export const EVENT_HIT = 2;
export const EVENT_KILL = 4;
export const EVENT_PICKUP = 8;
export const EVENT_HURT = 16;
export const EVENT_WAVE = 32;
export const EVENT_OVER = 64;
export const EVENT_UPGRADE = 128;

const TWO_PI = Math.PI * 2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** Where a hollow enters: a random point just outside one of the four edges. */
function spawnPoint(random) {
  const side = random.int(0, 3);
  const margin = 30;
  if (side === 0) return { x: random.range(0, FIELD.width), y: -margin };
  if (side === 1) return { x: random.range(0, FIELD.width), y: FIELD.height + margin };
  if (side === 2) return { x: -margin, y: random.range(0, FIELD.height) };
  return { x: FIELD.width + margin, y: random.range(0, FIELD.height) };
}

export function createWorld(random) {
  const state = {
    time: 0,
    wave: 0,
    phase: 'title',
    score: 0,
    best: 0,
    combo: 1,
    comboTimer: 0,
    comboKills: 0,
    shards: 0,
    kills: 0,
    waveKills: 0,
    waveTotal: 0,
    spawnTimer: 0,
    spawnLeft: 0,
    shake: 0,
    banner: '',
    bannerTimer: 0,
    choices: [],
    player: null,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    shardsList: [],
    particles: [],
    floaters: [],
    trees: [],
  };

  function makePlayer() {
    return {
      x: FIELD.width / 2,
      y: FIELD.height / 2 + 170,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: PLAYER.radius,
      hearts: PLAYER.maxHearts,
      maxHearts: PLAYER.maxHearts,
      speed: PLAYER.speed,
      fireInterval: PLAYER.fireInterval,
      fireTimer: 0,
      bulletSpeed: PLAYER.bulletSpeed,
      bulletDamage: PLAYER.bulletDamage,
      bulletRange: PLAYER.bulletRange,
      projectiles: 1,
      pierce: 0,
      magnetRadius: PLAYER.magnetRadius,
      dashCooldown: PLAYER.dashCooldown,
      dashTimer: 0,
      dashTimeLeft: 0,
      dashX: 0,
      dashY: 0,
      invulnerable: 0,
      comboWindow: COMBO.window,
    };
  }

  /** The grove's background trees: fixed per seed, so a scene always looks the same. */
  function plantTrees() {
    state.trees = [];
    for (let i = 0; i < 26; i += 1) {
      const x = random.range(40, FIELD.width - 40);
      const y = random.range(40, FIELD.height - 40);
      if (distance(x, y, GROVE.x, GROVE.y) < 150) continue;
      state.trees.push({ x, y, r: random.range(18, 42), sway: random.range(0, TWO_PI) });
    }
  }

  function burst(x, y, colour, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.range(0, TWO_PI);
      const v = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: random.range(0.3, 0.8),
        maxLife: 0.8,
        size: random.range(2, 5),
        colour,
      });
    }
  }

  function floater(x, y, text, colour) {
    state.floaters.push({ x, y, text, colour, life: 1 });
  }

  function startWave(wave) {
    const plan = wavePlan(wave);
    state.wave = wave;
    state.phase = 'fight';
    state.waveKills = 0;
    state.waveTotal = plan.total;
    state.spawnLeft = plan.total;
    state.spawnTimer = 0.6;
    state.banner = `WAVE ${wave}`;
    state.bannerTimer = 2.2;
  }

  function spawnEnemy() {
    const kinds = kindsForWave(state.wave);
    const kindId = random.pick(kinds);
    const def = ENEMY_KINDS[kindId];
    const plan = wavePlan(state.wave);
    const point = spawnPoint(random);
    const enemy = {
      kind: kindId,
      x: point.x,
      y: point.y,
      radius: def.radius,
      speed: def.speed * random.range(0.85, 1.15),
      hp: def.hp + plan.hpBonus,
      maxHp: def.hp + plan.hpBonus,
      damage: def.damage,
      score: def.score,
      shard: def.shard,
      colour: def.colour,
      shootTimer: random.range(1.2, 2.4),
      wobble: random.range(0, TWO_PI),
      flash: 0,
    };
    state.enemies.push(enemy);
  }

  function dropShards(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.range(0, TWO_PI);
      const dist = random.range(8, 34);
      state.shardsList.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * random.range(20, 70),
        vy: Math.sin(angle) * random.range(20, 70),
        life: SHARD.lifetime,
      });
    }
  }

  function killEnemy(index, events) {
    const enemy = state.enemies[index];
    state.enemies.splice(index, 1);
    state.kills += 1;
    state.waveKills += 1;
    state.comboKills += 1;
    state.comboTimer = state.player.comboWindow;
    state.combo = Math.min(COMBO.cap, 1 + state.comboKills * COMBO.step);
    const gained = Math.round(enemy.score * state.combo);
    state.score += gained;
    floater(enemy.x, enemy.y - enemy.radius, `+${gained}`, '#ffcf5e');
    burst(enemy.x, enemy.y, enemy.colour, 14, 180);
    burst(enemy.x, enemy.y, '#ffb347', 8, 120);
    dropShards(enemy.x, enemy.y, enemy.shard);
    state.shake = Math.min(10, state.shake + 3);
    return events | EVENT_KILL;
  }

  function hurtPlayer(damage, events) {
    const player = state.player;
    if (player.invulnerable > 0 || player.dashTimeLeft > 0) return events;
    player.hearts -= damage;
    player.invulnerable = PLAYER.invulnerable;
    state.combo = 1;
    state.comboKills = 0;
    state.shake = 14;
    burst(player.x, player.y, '#ff5a4e', 16, 220);
    events |= EVENT_HURT;
    if (player.hearts <= 0) {
      state.phase = 'over';
      state.best = Math.max(state.best, state.score);
      burst(player.x, player.y, '#ffb347', 40, 320);
      events |= EVENT_OVER;
    }
    return events;
  }

  function fireBullets(player, aimX, aimY, events) {
    const base = Math.atan2(aimY - player.y, aimX - player.x);
    const spread = 0.14;
    const count = player.projectiles;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * spread;
      const angle = base + offset;
      state.bullets.push({
        x: player.x + Math.cos(angle) * (player.radius + 8),
        y: player.y + Math.sin(angle) * (player.radius + 8),
        vx: Math.cos(angle) * player.bulletSpeed,
        vy: Math.sin(angle) * player.bulletSpeed,
        damage: player.bulletDamage,
        pierce: player.pierce,
        travelled: 0,
        range: player.bulletRange,
      });
    }
    player.fireTimer = player.fireInterval;
    burst(player.x + Math.cos(base) * 24, player.y + Math.sin(base) * 24, '#ffc46b', 3, 90);
    return events | EVENT_SHOOT;
  }

  function stepFight(dt, moveX, moveY, aimX, aimY, firing, dash, events) {
    const player = state.player;
    state.time += dt;

    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 1;
        state.comboKills = 0;
      }
    }
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.dashTimer > 0) player.dashTimer -= dt;

    // Dash: a short burst in the move direction (or the aim direction, standing still).
    if (dash && player.dashTimer <= 0 && player.dashTimeLeft <= 0) {
      let dx = moveX;
      let dy = moveY;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(player.angle);
        dy = Math.sin(player.angle);
      }
      const length = Math.hypot(dx, dy) || 1;
      player.dashX = dx / length;
      player.dashY = dy / length;
      player.dashTimeLeft = PLAYER.dashTime;
      player.dashTimer = player.dashCooldown;
      burst(player.x, player.y, '#7fe0d4', 10, 140);
    }
    if (player.dashTimeLeft > 0) {
      player.dashTimeLeft -= dt;
      player.x += player.dashX * PLAYER.dashSpeed * dt;
      player.y += player.dashY * PLAYER.dashSpeed * dt;
    } else {
      player.x += moveX * player.speed * dt;
      player.y += moveY * player.speed * dt;
    }
    player.x = clamp(player.x, 24, FIELD.width - 24);
    player.y = clamp(player.y, 24, FIELD.height - 24);
    player.angle = Math.atan2(aimY - player.y, aimX - player.x);

    // Spawning, until the wave's whole count is out.
    if (state.spawnLeft > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy();
        state.spawnLeft -= 1;
        state.spawnTimer = wavePlan(state.wave).interval;
      }
    }

    // Shooting.
    player.fireTimer -= dt;
    if (firing && player.fireTimer <= 0) {
      events = fireBullets(player, aimX, aimY, events);
    }

    // Enemies chase the keeper; spitters hold off and shoot ember-spit back.
    for (const enemy of state.enemies) {
      enemy.wobble += dt * 2;
      if (enemy.flash > 0) enemy.flash -= dt;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      let speed = enemy.speed;
      if (enemy.kind === 'spitter') {
        if (dist < 260) speed = -enemy.speed * 0.7;
        else if (dist < 340) speed = 0;
        enemy.shootTimer -= dt;
        if (enemy.shootTimer <= 0 && dist < 520) {
          enemy.shootTimer = random.range(2.0, 2.8);
          state.enemyBullets.push({
            x: enemy.x,
            y: enemy.y,
            vx: (dx / dist) * 190,
            vy: (dy / dist) * 190,
            radius: 7,
            life: 3.5,
          });
          burst(enemy.x, enemy.y, '#a86fd6', 4, 80);
        }
      }
      const wob = enemy.kind === 'wisp' ? Math.sin(enemy.wobble) * 40 : 0;
      const nx = dx / dist;
      const ny = dy / dist;
      enemy.x += (nx * speed + -ny * wob * 0.4) * dt;
      enemy.y += (ny * speed + nx * wob * 0.4) * dt;
      // Touching the keeper hurts.
      if (dist < enemy.radius + player.radius - 2) {
        events = hurtPlayer(enemy.damage, events);
        // The hollow bounces off so one touch is not a chain of hits.
        enemy.x -= nx * 26;
        enemy.y -= ny * 26;
      }
    }

    // The keeper's bolts.
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.travelled += Math.hypot(bullet.vx, bullet.vy) * dt;
      let dead = bullet.travelled >= bullet.range
        || bullet.x < -20 || bullet.x > FIELD.width + 20
        || bullet.y < -20 || bullet.y > FIELD.height + 20;
      if (!dead) {
        for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
          const enemy = state.enemies[j];
          if (distance(bullet.x, bullet.y, enemy.x, enemy.y) < enemy.radius + 6) {
            enemy.hp -= bullet.damage;
            enemy.flash = 0.12;
            burst(bullet.x, bullet.y, '#ffd9a0', 5, 120);
            events |= EVENT_HIT;
            if (enemy.hp <= 0) {
              events = killEnemy(j, events);
            }
            if (bullet.pierce > 0) {
              bullet.pierce -= 1;
            } else {
              dead = true;
            }
            break;
          }
        }
      }
      if (dead) state.bullets.splice(i, 1);
    }

    // Hollow spit.
    for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
      const shot = state.enemyBullets[i];
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      let dead = shot.life <= 0 || shot.x < -20 || shot.x > FIELD.width + 20 || shot.y < -20 || shot.y > FIELD.height + 20;
      if (!dead && distance(shot.x, shot.y, player.x, player.y) < shot.radius + player.radius - 2) {
        events = hurtPlayer(1, events);
        dead = true;
      }
      if (dead) state.enemyBullets.splice(i, 1);
    }

    // Shards: drift, then fly to the keeper inside the magnet radius.
    for (let i = state.shardsList.length - 1; i >= 0; i -= 1) {
      const shard = state.shardsList[i];
      shard.life -= dt;
      const dist = distance(shard.x, shard.y, player.x, player.y);
      if (dist < player.magnetRadius) {
        const pull = SHARD.magnetSpeed * dt;
        shard.x += ((player.x - shard.x) / (dist || 1)) * pull;
        shard.y += ((player.y - shard.y) / (dist || 1)) * pull;
      } else {
        shard.x += shard.vx * dt;
        shard.y += shard.vy * dt;
        shard.vx *= 0.98;
        shard.vy *= 0.98;
      }
      if (dist < player.radius + SHARD.radius + 2) {
        state.shardsList.splice(i, 1);
        state.shards += 1;
        state.score += SHARD.value;
        floater(player.x, player.y - 26, `+${SHARD.value}`, '#ffcf5e');
        events |= EVENT_PICKUP;
      } else if (shard.life <= 0) {
        state.shardsList.splice(i, 1);
      }
    }

    // Particles and floating score text fade out.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const f = state.floaters[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }

    // Wave cleared: every hollow dead and none left to spawn.
    if (state.phase === 'fight' && state.spawnLeft === 0 && state.enemies.length === 0) {
      state.phase = 'upgrade';
      state.choices = drawUpgrades(random);
      if (state.wave % 3 === 0 && player.hearts < player.maxHearts) {
        player.hearts += 1;
        floater(player.x, player.y - 40, '+1 ♥ the grove thanks you', '#7fe0a8');
      }
      events |= EVENT_UPGRADE;
    }
    return events;
  }

  function stepAmbient(dt) {
    state.time += dt;
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    // Embers drift up from the grove while the title is up.
    if (state.particles.length < 40 && random.next() < 0.3) {
      state.particles.push({
        x: GROVE.x + random.range(-60, 60),
        y: GROVE.y + random.range(-20, 40),
        vx: random.range(-8, 8),
        vy: random.range(-46, -18),
        life: random.range(1, 2.4),
        maxLife: 2.4,
        size: random.range(1.5, 3.5),
        colour: '#ffb347',
      });
    }
  }

  return {
    state,
    reset() {
      state.time = 0;
      state.wave = 0;
      state.phase = 'title';
      state.score = 0;
      state.combo = 1;
      state.comboTimer = 0;
      state.comboKills = 0;
      state.shards = 0;
      state.kills = 0;
      state.waveKills = 0;
      state.waveTotal = 0;
      state.spawnTimer = 0;
      state.spawnLeft = 0;
      state.shake = 0;
      state.banner = '';
      state.bannerTimer = 0;
      state.choices = [];
      state.player = makePlayer();
      state.enemies = [];
      state.bullets = [];
      state.enemyBullets = [];
      state.shardsList = [];
      state.particles = [];
      state.floaters = [];
      plantTrees();
    },
    /** Begin a run from the title screen. */
    startRun() {
      this.reset();
      startWave(1);
    },
    /** Take one of the three upgrade cards, then open the next wave. */
    chooseUpgrade(index) {
      if (state.phase !== 'upgrade') return;
      const picked = state.choices[index];
      if (!picked) return;
      picked.apply(state.player, this);
      state.choices = [];
      startWave(state.wave + 1);
    },
    /**
     * Advance the world one fixed step. In the fight phase the arguments are the
     * live controls; on other phases the world only idles (ambient embers).
     * Returns the EVENT_* bitmask of what happened this step.
     */
    step(dt, moveX, moveY, aimX, aimY, firing, dash) {
      if (state.phase === 'fight') {
        return stepFight(dt, moveX, moveY, aimX, aimY, firing, dash, 0);
      }
      stepAmbient(dt);
      return 0;
    },
  };
}
