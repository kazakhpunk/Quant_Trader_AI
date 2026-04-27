/** Tiny in-process TTL cache for slow read endpoints. Keyed by string; values
 *  expire after `ttlMs`. No eviction beyond TTL — fine for the handful of
 *  endpoints (pairs, signals, ratings) that use this. Single-instance only;
 *  switch to Redis if/when we run multiple backend processes.
 */

type Entry<T> = { value: Promise<T>; expires: number };

const store = new Map<string, Entry<unknown>>();

export async function memoize<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > now) return hit.value;
  // Cache the in-flight promise so concurrent callers share one fetch.
  const value = fetcher().catch((err) => {
    store.delete(key);
    throw err;
  });
  store.set(key, { value, expires: now + ttlMs });
  return value;
}

/** Clear one key (or all if no key given). Useful for tests + the refresh path. */
export function invalidate(key?: string) {
  if (key === undefined) store.clear();
  else store.delete(key);
}
