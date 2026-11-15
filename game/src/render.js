// Everything Emberfall shows: the grove, the keeper, the hollows, the HUD and
// every screen. The canvas is a fixed 1280x720 logical area, letterboxed into
// the window; all drawing is vector shapes in the ember orange / teal palette,
// so the game reads at a glance even shrunk to a contact sheet.
import { FIELD, GROVE, PALETTE, FONT } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** Button rectangles the loop hit-tests, recomputed every draw. */
export const ui = {
  start: { x: 520, y: 520, w: 240, h: 64 },
  restart: { x: 520, y: 540, w: 240, h: 64 },
  resume: { x: 520, y: 400, w: 240, h: 64 },
  cards: [],
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -5, -10, 0, -4);
  ctx.bezierCurveTo(5, -10, 9, -3, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff6b5e' : '#3a2a28';
  ctx.fill();
  ctx.restore();
}

function drawTree(ctx, tree, time) {
  const sway = Math.sin(time * 0.6 + tree.sway) * 3;
  ctx.fillStyle = '#0e1f16';
  ctx.beginPath();
  ctx.arc(tree.x + sway, tree.y, tree.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14301f';
  ctx.beginPath();
  ctx.arc(tree.x + sway - tree.r * 0.25, tree.y - tree.r * 0.3, tree.r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 179, 71, 0.55)';
  ctx.beginPath();
  ctx.arc(tree.x + sway + tree.r * 0.4, tree.y - tree.r * 0.2, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawGrove(ctx, state) {
  const pulse = 1 + Math.sin(state.time * 1.8) * 0.05;
  const glow = ctx.createRadialGradient(GROVE.x, GROVE.y, 10, GROVE.x, GROVE.y, GROVE.radius * 2.4 * pulse);
  glow.addColorStop(0, 'rgba(255, 154, 60, 0.5)');
  glow.addColorStop(0.5, 'rgba(255, 154, 60, 0.12)');
  glow.addColorStop(1, 'rgba(255, 154, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(GROVE.x - 200, GROVE.y - 200, 400, 400);
  // Trunk and ember canopy.
  ctx.fillStyle = PALETTE.groveTrunk;
  ctx.beginPath();
  ctx.moveTo(GROVE.x - 12, GROVE.y + 30);
  ctx.lineTo(GROVE.x - 6, GROVE.y - 18);
  ctx.lineTo(GROVE.x + 6, GROVE.y - 18);
  ctx.lineTo(GROVE.x + 12, GROVE.y + 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.groveLeaf;
  ctx.beginPath();
  ctx.arc(GROVE.x, GROVE.y - 34, 46 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f9c6d';
  ctx.beginPath();
  ctx.arc(GROVE.x - 22, GROVE.y - 22, 26, 0, Math.PI * 2);
  ctx.arc(GROVE.x + 24, GROVE.y - 20, 24, 0, Math.PI * 2);
  ctx.fill();
  // The last ember: a glowing heart at the canopy's centre.
  const flicker = 0.75 + Math.sin(state.time * 5) * 0.12 + Math.sin(state.time * 11) * 0.06;
  ctx.save();
  ctx.globalAlpha = flicker;
  ctx.fillStyle = '#ffd9a0';
  ctx.beginPath();
  ctx.arc(GROVE.x, GROVE.y - 34, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff9a3c';
  ctx.beginPath();
  ctx.arc(GROVE.x, GROVE.y - 34, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255, 201, 107, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(GROVE.x, GROVE.y, GROVE.radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPlayer(ctx, player, time) {
  const blink = player.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  ctx.translate(player.x, player.y);
  // Cloak.
  ctx.fillStyle = '#7a4a1f';
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(-14, 6);
  ctx.lineTo(-8, -12);
  ctx.lineTo(8, -12);
  ctx.lineTo(14, 6);
  ctx.closePath();
  ctx.fill();
  // Ember core and face.
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(0, -4, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, -4, 7, 0, Math.PI * 2);
  ctx.fill();
  // Aim staff.
  ctx.rotate(player.angle);
  ctx.strokeStyle = '#c98a4b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(26, 0);
  ctx.stroke();
  ctx.fillStyle = '#ffc46b';
  ctx.beginPath();
  ctx.arc(28, 0, 5 + Math.sin(time * 6) * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Dash cooldown ring.
  if (player.dashTimer > 0) {
    ctx.strokeStyle = 'rgba(127, 224, 212, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 24, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (1 - player.dashTimer / player.dashCooldown)));
    ctx.stroke();
  }
}

function drawEnemy(ctx, enemy, time) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const flash = enemy.flash > 0;
  ctx.fillStyle = flash ? '#ffffff' : enemy.colour;
  if (enemy.kind === 'wisp') {
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b1410';
    ctx.beginPath();
    ctx.arc(-4, -2, 2.4, 0, Math.PI * 2);
    ctx.arc(4, -2, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === 'brute') {
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 4, enemy.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.enemyEye;
    ctx.beginPath();
    ctx.arc(-8, -6, 3.4, 0, Math.PI * 2);
    ctx.arc(8, -6, 3.4, 0, Math.PI * 2);
    ctx.fill();
    // Horns.
    ctx.fillStyle = flash ? '#ffffff' : enemy.colour;
    ctx.beginPath();
    ctx.moveTo(-18, -16);
    ctx.lineTo(-24, -30);
    ctx.lineTo(-10, -20);
    ctx.closePath();
    ctx.moveTo(18, -16);
    ctx.lineTo(24, -30);
    ctx.lineTo(10, -20);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.kind === 'spitter') {
    ctx.beginPath();
    ctx.moveTo(0, -enemy.radius);
    ctx.lineTo(enemy.radius, 0);
    ctx.lineTo(0, enemy.radius);
    ctx.lineTo(-enemy.radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.enemyEye;
    ctx.beginPath();
    ctx.arc(0, -2, 3.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Cinder: a lumpy ember husk.
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 180, 90, 0.5)';
    ctx.beginPath();
    ctx.arc(-3, -4, enemy.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.enemyEye;
    ctx.beginPath();
    ctx.arc(-5, -3, 2.6, 0, Math.PI * 2);
    ctx.arc(5, -3, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Health bar over hurt brutes and spitters.
  if (enemy.maxHp > 2 && enemy.hp < enemy.maxHp) {
    const w = enemy.radius * 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w, 5);
    ctx.fillStyle = '#ff6b5e';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w * (enemy.hp / enemy.maxHp), 5);
  }
}

function drawHud(ctx, state, best) {
  const player = state.player;
  ctx.fillStyle = 'rgba(8, 16, 12, 0.72)';
  roundRect(ctx, 16, 12, FIELD.width - 32, 56, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 26px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`SCORE ${state.score.toLocaleString('en-US')}`, 32, 40);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 16px ${FONT}`;
  ctx.fillText(`BEST ${Math.max(best, state.score).toLocaleString('en-US')}`, 32, 58);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 26px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`WAVE ${Math.max(1, state.wave)}`, FIELD.width / 2, 34);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 15px ${FONT}`;
  const left = state.waveTotal - state.waveKills;
  ctx.fillText(
    state.phase === 'fight' ? `${left} hollow${left === 1 ? '' : 's'} left`
      : state.phase === 'upgrade' ? 'wave cleared'
        : state.phase === 'over' ? 'the grove has fallen'
          : 'wave cleared',
    FIELD.width / 2, 56);
  // Hearts, top right.
  for (let i = 0; i < player.maxHearts; i += 1) {
    drawHeart(ctx, FIELD.width - 40 - i * 30, 40, 15, i < player.hearts);
  }
  ctx.fillStyle = PALETTE.shard;
  ctx.font = `700 20px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`◆ ${state.shards} shards`, FIELD.width - 170, 40);
  // Combo meter under the score.
  if (state.combo > 1) {
    ctx.fillStyle = '#ff9a3c';
    ctx.font = `800 20px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`COMBO ×${state.combo.toFixed(2).replace(/\.?0+$/, '')}`, 32, 86);
    ctx.fillStyle = 'rgba(255, 154, 60, 0.4)';
    ctx.fillRect(32, 96, 120, 5);
    ctx.fillStyle = '#ff9a3c';
    ctx.fillRect(32, 96, 120 * (state.comboTimer / state.player.comboWindow), 5);
  }
  // Dash hint, bottom left.
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 14px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('WASD move · mouse aim · click / Space shoot · Shift dash · P pause', 20, FIELD.height - 16);
}

function drawBanner(ctx, state) {
  if (state.bannerTimer <= 0 || !state.banner) return;
  const alpha = Math.min(1, state.bannerTimer);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PALETTE.text;
  ctx.font = `800 64px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff9a3c';
  ctx.shadowBlur = 28;
  ctx.fillText(state.banner, FIELD.width / 2, 170);
  ctx.restore();
}

function drawButton(ctx, rect, label, sub) {
  ctx.fillStyle = '#ff9a3c';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  ctx.fillStyle = '#241505';
  ctx.font = `800 26px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + (sub ? -10 : 0));
  if (sub) {
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText(sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 18);
  }
}

function drawTitle(ctx, state, best) {
  ctx.fillStyle = 'rgba(6, 12, 9, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffb347';
  ctx.font = `800 96px ${FONT}`;
  ctx.shadowColor = '#ff6b2e';
  ctx.shadowBlur = 40;
  ctx.fillText('EMBERFALL', FIELD.width / 2, 190);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText('Guard the last ember grove. Survive the hollow night.', FIELD.width / 2, 258);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 19px ${FONT}`;
  ctx.fillText('WASD / arrows to move · mouse to aim · click or Space to shoot', FIELD.width / 2, 300);
  ctx.fillText('Shift to dash · collect shards · choose an upgrade between waves', FIELD.width / 2, 328);
  ctx.fillText('Lose all 3 hearts and the grove goes dark.', FIELD.width / 2, 356);
  drawButton(ctx, ui.start, 'LIGHT THE EMBER', 'or press Enter');
  if (best > 0) {
    ctx.fillStyle = PALETTE.shard;
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText(`Best score: ${best.toLocaleString('en-US')}`, FIELD.width / 2, 622);
  }
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 15px ${FONT}`;
  ctx.fillText('An original game · art, sound and music made in code · no downloads', FIELD.width / 2, 688);
}

function drawUpgrade(ctx, state) {
  ctx.fillStyle = 'rgba(6, 12, 9, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `800 44px ${FONT}`;
  ctx.fillText(`WAVE ${state.wave} CLEARED`, FIELD.width / 2, 130);
  ctx.fillStyle = PALETTE.shard;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(`Score ${state.score.toLocaleString('en-US')} · ${state.shards} shards gathered`, FIELD.width / 2, 176);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 19px ${FONT}`;
  ctx.fillText('The grove holds. Choose one ember blessing:', FIELD.width / 2, 214);
  ui.cards = [];
  const cardW = 300;
  const cardH = 220;
  const gap = 36;
  const total = cardW * 3 + gap * 2;
  const startX = (FIELD.width - total) / 2;
  state.choices.forEach((choice, i) => {
    const x = startX + i * (cardW + gap);
    const y = 260;
    ui.cards.push({ x, y, w: cardW, h: cardH, index: i });
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, x, y, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.player;
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText(choice.icon, x + cardW / 2, y + 58);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText(choice.name, x + cardW / 2, y + 112);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 17px ${FONT}`;
    ctx.fillText(choice.desc, x + cardW / 2, y + 150);
    ctx.fillStyle = PALETTE.shard;
    ctx.font = `700 16px ${FONT}`;
    ctx.fillText(`press ${i + 1} or click`, x + cardW / 2, y + 188);
  });
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(6, 12, 9, 0.7)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `800 56px ${FONT}`;
  ctx.fillText('PAUSED', FIELD.width / 2, 300);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 20px ${FONT}`;
  ctx.fillText('P or Esc to keep playing', FIELD.width / 2, 356);
  drawButton(ctx, ui.resume, 'RESUME', '');
}

function drawOver(ctx, state, best) {
  ctx.fillStyle = 'rgba(10, 6, 6, 0.66)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff6b5e';
  ctx.font = `800 72px ${FONT}`;
  ctx.shadowColor = '#ff2e1e';
  ctx.shadowBlur = 30;
  ctx.fillText('THE GROVE GOES DARK', FIELD.width / 2, 190);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(`Final score: ${state.score.toLocaleString('en-US')}`, FIELD.width / 2, 268);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 20px ${FONT}`;
  ctx.fillText(`You reached wave ${state.wave} · ${state.kills} hollows banished · ${state.shards} shards gathered`, FIELD.width / 2, 310);
  if (state.score >= best && state.score > 0) {
    ctx.fillStyle = PALETTE.shard;
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText('★ NEW BEST SCORE ★', FIELD.width / 2, 352);
  } else if (best > 0) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText(`Best: ${best.toLocaleString('en-US')}`, FIELD.width / 2, 352);
  }
  drawButton(ctx, ui.restart, 'PLAY AGAIN', 'or press R');
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const backing = 1280;
  const backingH = 720;
  canvas.width = backing;
  canvas.height = backingH;

  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
  }
  fit();
  window.addEventListener('resize', fit);

  function drawBackground(state) {
    const gradient = ctx.createRadialGradient(
      GROVE.x, GROVE.y, 60, GROVE.x, GROVE.y, 620,
    );
    gradient.addColorStop(0, PALETTE.groundA);
    gradient.addColorStop(1, PALETTE.groundB);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Moss speckles.
    ctx.fillStyle = 'rgba(46, 125, 91, 0.25)';
    for (let i = 0; i < state.trees.length; i += 1) {
      const tree = state.trees[i];
      ctx.beginPath();
      ctx.arc(tree.x + 30, tree.y + 26, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const tree of state.trees) drawTree(ctx, tree, state.time);
    drawGrove(ctx, state);
  }

  function drawWorld(state) {
    // Shards.
    for (const shard of state.shardsList) {
      const blink = 0.7 + Math.sin(state.time * 8 + shard.x) * 0.3;
      ctx.save();
      ctx.globalAlpha = blink;
      ctx.fillStyle = PALETTE.shard;
      ctx.beginPath();
      ctx.moveTo(shard.x, shard.y - 8);
      ctx.lineTo(shard.x + 6, shard.y);
      ctx.lineTo(shard.x, shard.y + 8);
      ctx.lineTo(shard.x - 6, shard.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Hollow spit.
    for (const shot of state.enemyBullets) {
      ctx.fillStyle = '#c98ae8';
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#efe0ff';
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const enemy of state.enemies) drawEnemy(ctx, enemy, state.time);
    // Bolts.
    for (const bullet of state.bullets) {
      ctx.fillStyle = PALETTE.bullet;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    drawPlayer(ctx, state.player, state.time);
    // Particles.
    for (const p of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Floating score text.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of state.floaters) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.colour;
      ctx.font = `800 18px ${FONT}`;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  return {
    draw(state, screen, best) {
      ctx.save();
      if (state.shake > 0.5) {
        ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
      }
      ctx.clearRect(-20, -20, FIELD.width + 40, FIELD.height + 40);
      drawBackground(state);
      if (screen === SCREEN_TITLE) {
        drawWorld(state);
        drawTitle(ctx, state, best);
      } else if (screen === SCREEN_UPGRADE) {
        drawWorld(state);
        drawHud(ctx, state, best);
        drawUpgrade(ctx, state);
      } else if (screen === SCREEN_OVER) {
        drawWorld(state);
        drawHud(ctx, state, best);
        drawOver(ctx, state, best);
      } else if (screen === SCREEN_PAUSED) {
        drawWorld(state);
        drawHud(ctx, state, best);
        drawPaused(ctx);
      } else {
        drawWorld(state);
        drawHud(ctx, state, best);
        drawBanner(ctx, state);
      }
      ctx.restore();
      // Vignette, so the grove glows against dark edges.
      const vignette = ctx.createRadialGradient(
        FIELD.width / 2, FIELD.height / 2, 320, FIELD.width / 2, FIELD.height / 2, 780,
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    },
  };
}
