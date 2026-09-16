import assert from 'node:assert/strict';
import { initHomeSearchMotion } from '../../../src/home-search-motion.js';

function surface() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(type) { for (const fn of listeners.get(type) || []) fn(); },
    count() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
  };
}
function environment(reduce) {
  let anchorTop = 160, disconnected = false, seq = 0;
  const frames = new Map(), calls = [], values = new Map(), classes = new Set();
  const style = {
    getPropertyValue: key => values.get(key) || '', getPropertyPriority: () => '',
    setProperty: (key, value) => values.set(key, value), removeProperty: key => values.delete(key),
  };
  const form = Object.assign(surface(), {
    style,
    classList: { contains: key => classes.has(key), add: key => classes.add(key), remove: key => classes.delete(key), toggle(key, enabled) { enabled ? classes.add(key) : classes.delete(key); } },
    contains: item => item === input || item === form,
    getBoundingClientRect() { return { left: 100, top: classes.has('is-docked') ? 700 : anchorTop, width: 600, height: 72, bottom: classes.has('is-docked') ? 772 : anchorTop + 72 }; },
    animate(keyframes, options) { const animation = { keyframes, options, onfinish: null, canceled: false, cancel() { this.canceled = true; }, finish() { this.onfinish?.(); } }; calls.push(animation); return animation; },
  });
  const input = { value: 'cuaderno', selectionStart: 4, selectionEnd: 4 };
  const anchor = { contains: item => item === form, getBoundingClientRect: () => ({ left: 100, top: anchorTop, bottom: anchorTop + 72, width: 600, height: 72 }) };
  const nav = { getBoundingClientRect: () => ({ bottom: 64 }) };
  const media = Object.assign(surface(), { matches: reduce });
  const viewport = Object.assign(surface(), { height: 800, offsetTop: 0, scale: 1 });
  const win = Object.assign(surface(), { innerHeight: 800, visualViewport: viewport });
  globalThis.window = win;
  globalThis.document = { activeElement: null, getElementById: id => ({ homeSearch: form, homeSearchAnchor: anchor, nav })[id] };
  globalThis.matchMedia = () => media;
  globalThis.getComputedStyle = () => ({ opacity: '1' });
  globalThis.requestAnimationFrame = fn => { frames.set(++seq, fn); return seq; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  globalThis.ResizeObserver = class { observe() {} disconnect() { disconnected = true; } };
  function flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); }
  function scroll(top) { anchorTop = top; win.emit('scroll'); flush(); }
  return { form, input, media, viewport, win, calls, flush, scroll, disconnected: () => disconnected, frames };
}

const reduced = environment(true);
const disposeReduced = initHomeSearchMotion();
assert.equal(initHomeSearchMotion(), disposeReduced, 'initialization is idempotent');
reduced.flush();
reduced.scroll(8); // bottom=80: equality remains in the anchor.
assert.equal(reduced.form.classList.contains('is-docked'), false);
reduced.scroll(7); // bottom=79 < nav bottom64 +16.
assert.equal(reduced.form.classList.contains('is-docked'), true);
assert.equal(reduced.calls.length, 0, 'reduced motion never calls animate');
reduced.scroll(160);
assert.equal(reduced.form.classList.contains('is-docked'), false);
assert.equal(document.getElementById('homeSearch'), reduced.form, 'same form instance');
assert.equal(reduced.input.value, 'cuaderno');
assert.equal(reduced.input.selectionStart, 4);
disposeReduced();
assert.equal(reduced.win.count() + reduced.viewport.count() + reduced.form.count() + reduced.media.count(), 0, 'cleanup removes listeners');
assert.equal(reduced.disconnected(), true);
assert.equal(reduced.frames.size, 0);

const normal = environment(false);
const dispose = initHomeSearchMotion();
normal.flush();
normal.scroll(-100);
const entrance = normal.calls.at(-1);
assert.equal(entrance.options.duration, 360);
assert.match(entrance.keyframes[0].transform, /translate\(0px, 116px\)/, 'capsule starts below viewport, not at hero');
assert.equal(entrance.keyframes[1].transform, 'translate(0, 0px)');
normal.scroll(160);
assert.equal(entrance.canceled, true, 'return cancels current entrance');
const exit = normal.calls.at(-1);
assert.equal(exit.options.duration, 160);
assert.equal(normal.form.classList.contains('is-docked'), true, 'same form stays docked during exit');
normal.scroll(-100);
assert.equal(exit.canceled, true, 'reversing exit cancels stale completion');
normal.calls.at(-1).finish();
normal.flush();
normal.scroll(160);
normal.calls.at(-1).finish();
assert.equal(normal.form.classList.contains('is-docked'), false, 'exit restores original anchor');
assert.equal(normal.calls.at(-1).options.duration, 120, 'anchor uses only a short fade');
normal.calls.at(-1).finish();
normal.flush();
assert.equal(document.getElementById('homeSearch'), normal.form);
// Focused dock follows visual viewport keyboard occlusion immediately.
normal.scroll(-100);
normal.calls.at(-1).finish();
document.activeElement = normal.input;
normal.form.emit('focusin');
normal.viewport.height = 500;
normal.viewport.emit('resize'); normal.flush();
assert.equal(normal.form.style.getPropertyValue('--search-keyboard-bottom'), '300px');
normal.scroll(160);
assert.equal(normal.form.classList.contains('is-docked'), true, 'focus lock resists mobile auto-scroll');
normal.media.matches = true;
const callsBefore = normal.calls.length;
normal.media.emit('change'); normal.flush();
assert.equal(normal.calls.length, callsBefore, 'live reduced-motion switch does not animate');
dispose();
assert.equal(normal.win.count() + normal.viewport.count() + normal.form.count() + normal.media.count(), 0);
console.log('PASS: threshold, same form/input, reduced motion, bottom entrance, reversal, anchor fade, keyboard, cleanup. DOM simulation only; no physical-device or FPS claim.');
