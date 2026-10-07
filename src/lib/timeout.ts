/**
 * Resolve to `fallback` if `promise` has not settled within `ms`.
 *
 * Used around every network call on the request path (Supabase Auth, Paddle
 * pricing) so a slow upstream degrades one feature instead of holding the
 * whole request until the platform kills it. The underlying call is not
 * cancelled; its late result is simply ignored.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise.catch(() => fallback), timeout]).finally(() => clearTimeout(timer));
}
