import { useSyncExternalStore } from 'react';

/**
 * Single shared 1-second clock, module-level and ref-counted — every
 * component calling useCurrentTime() subscribes to the SAME interval
 * instead of each mounting its own setInterval. The interval starts on the
 * first subscriber and is torn down when the last one unmounts, so an idle
 * screen with no timer visible costs nothing.
 */
let now = Date.now();
let intervalId = null;
const listeners = new Set();

function tick() {
  now = Date.now();
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  if (intervalId === null) {
    intervalId = setInterval(tick, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getSnapshot() {
  return now;
}

/** Live `Date.now()`, ticking once per second, shared across every caller. */
export default function useCurrentTime() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
