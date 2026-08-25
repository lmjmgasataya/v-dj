const SLOW_CHECKIN_TIMEOUT_MS = 5000;

export { SLOW_CHECKIN_TIMEOUT_MS };

export type RaceResult<T> = { timedOut: true; settled: Promise<T> } | { timedOut: false; value: T };

/**
 * Races a promise against a timeout — WITHOUT actually cancelling it.
 * Next.js's Server Action calling convention (a plain `await someAction(...)`)
 * doesn't expose an AbortSignal to hook into, so a "timed out" call keeps
 * running server-side in the background regardless. Callers get the original
 * promise back via `settled` so they can reconcile once it eventually
 * resolves — e.g. drop a redundant offline-queue entry if it turns out the
 * slow request actually succeeded after all.
 *
 * A genuine rejection that happens BEFORE the timeout still rejects this
 * promise normally, so existing try/catch offline-fallback handling around
 * the call doesn't need to change — this only adds a third outcome (timed
 * out, still pending) on top of the usual resolve/reject.
 */
export function raceWithTimeout<T>(promise: Promise<T>, ms: number): Promise<RaceResult<T>> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ timedOut: true, settled: promise });
    }, ms);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ timedOut: false, value });
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
