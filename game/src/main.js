// EMBERFALL — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between five screens:
// title, play, upgrade (between waves), paused and game over.
//
// ?seed=N fixes the spawn pattern. ?shot=title|play|upgrade|over (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_HURT, EVENT_KILL, EVENT_OVER, EVENT_PICKUP, EVENT_SHOOT, EVENT_UPGRADE, EVENT_WAVE } from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, ui } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function announce(text) {
  status.textContent = text;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  world.reset();

  function inside(rect, x, y) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  function startPlaying() {
    audio.unlock();
    world.startRun();
    screen = SCREEN_PLAY;
    audio.wave();
    announce('Wave 1. Guard the grove.');
  }

  function playEvents(events) {
    if (events & EVENT_SHOOT) audio.shoot();
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_KILL) audio.kill();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_HURT) audio.hurt();
    if (events & EVENT_WAVE) audio.wave();
    if (events & EVENT_UPGRADE) {
      audio.upgrade();
      screen = SCREEN_UPGRADE;
      announce(`Wave ${world.state.wave} cleared. Choose an upgrade.`);
    }
    if (events & EVENT_OVER) {
      audio.gameOver();
      screen = SCREEN_OVER;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce(`Game over. Final score ${world.state.score}. Press R to play again.`);
    }
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    input.updateMove();

    if (screen === SCREEN_TITLE) {
      if (input.wasPressed(ACTION_CONFIRM) || input.clicks.some((c) => inside(ui.start, c.x, c.y))) {
        startPlaying();
      }
      while (accumulator >= STEP) {
        world.step(STEP, 0, 0, 0, 0, false, false);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      if (input.wasPressed(ACTION_PAUSE)) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
      while (accumulator >= STEP) {
        const events = world.step(
          STEP,
          input.moveX,
          input.moveY,
          input.mouseX,
          input.mouseY,
          input.mouseDown || input.firing,
          input.wasPressed(ACTION_DASH),
        );
        playEvents(events);
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
    } else if (screen === SCREEN_UPGRADE) {
      let picked = -1;
      if (input.wasPressed(ACTION_CONFIRM)) picked = 0;
      for (const key of ['Digit1', 'Digit2', 'Digit3']) {
        if (input.isDown(key)) picked = Number(key.slice(-1)) - 1;
      }
      input.clicks.forEach((click) => {
        ui.cards.forEach((card) => {
          if (inside(card, click.x, click.y)) picked = card.index;
        });
      });
      if (picked >= 0 && picked < world.state.choices.length) {
        world.chooseUpgrade(picked);
        screen = SCREEN_PLAY;
        audio.wave();
        announce(`Wave ${world.state.wave}.`);
      }
      while (accumulator >= STEP) {
        world.step(STEP, 0, 0, 0, 0, false, false);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PAUSED) {
      if (input.wasPressed(ACTION_PAUSE) || input.clicks.some((c) => inside(ui.resume, c.x, c.y))) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_OVER) {
      if (input.wasPressed(ACTION_RESTART) || input.wasPressed(ACTION_CONFIRM)
        || input.clicks.some((c) => inside(ui.restart, c.x, c.y))) {
        startPlaying();
      }
    }
    if (input.wasPressed(ACTION_RESTART) && screen !== SCREEN_OVER && screen !== SCREEN_TITLE) {
      startPlaying();
    }

    renderer.draw(world.state, screen, best);
    input.endFrame();
    requestAnimationFrame(frame);
  }

  announce('Emberfall. Press Enter to light the ember.');
  requestAnimationFrame(frame);
}

window.addEventListener('error', (event) => {
  window.__shotError = String(event.message || event.error || 'page error');
});

if (shot) runShot(shot);
else runGame();
