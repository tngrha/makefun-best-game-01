// Keyboard and mouse, read by the loop every frame. Keys are tracked by their
// physical code so WASD and the arrows both work; the mouse position is kept in
// the game's 1280x720 logical coordinates, whatever the window size.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_DASH = 'dash';
export const ACTION_RESTART = 'restart';

const CONFIRM_KEYS = new Set(['Enter', 'Space', 'NumpadEnter']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const DASH_KEYS = new Set(['ShiftLeft', 'ShiftRight']);
const RESTART_KEYS = new Set(['KeyR']);
const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const input = {
    mouseX: FIELD.width / 2,
    mouseY: FIELD.height / 2 - 160,
    mouseDown: false,
    /** Clicks since the last frame, in logical coordinates: UI buttons consume them. */
    clicks: [],
    moveX: 0,
    moveY: 0,
    firing: false,
    /** True only on the frame the key went down. */
    wasPressed(action) {
      return pressed.has(action);
    },
    isDown(code) {
      return keys.has(code);
    },
    /** Call at the end of every frame: edge-triggered presses last one frame. */
    endFrame() {
      pressed.clear();
      input.clicks.length = 0;
      input.moveX = 0;
      input.moveY = 0;
    },
  };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.max(FIELD.width / rect.width, FIELD.height / rect.height);
    return {
      x: (event.clientX - rect.left) * scale + (FIELD.width - rect.width * scale) / 2,
      y: (event.clientY - rect.top) * scale + (FIELD.height - rect.height * scale) / 2,
    };
  }

  function mark(action) {
    pressed.add(action);
  }

  window.addEventListener('keydown', (event) => {
    if (MOVE_KEYS.has(event.code) || event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (CONFIRM_KEYS.has(event.code)) mark(ACTION_CONFIRM);
    if (PAUSE_KEYS.has(event.code)) mark(ACTION_PAUSE);
    if (DASH_KEYS.has(event.code)) mark(ACTION_DASH);
    if (RESTART_KEYS.has(event.code)) mark(ACTION_RESTART);
    if (event.code === 'Space') input.firing = true;
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    if (event.code === 'Space') input.firing = false;
  });
  window.addEventListener('blur', () => {
    keys.clear();
    input.mouseDown = false;
    input.firing = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const point = toLogical(event);
    input.mouseX = point.x;
    input.mouseY = point.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const point = toLogical(event);
    input.mouseX = point.x;
    input.mouseY = point.y;
    if (event.button === 0) {
      input.mouseDown = true;
      input.clicks.push({ x: point.x, y: point.y });
    }
    if (event.button === 2) mark(ACTION_DASH);
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  input.updateMove = () => {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    const length = Math.hypot(x, y);
    if (length > 0) {
      input.moveX = x / length;
      input.moveY = y / length;
    }
  };

  return input;
}
