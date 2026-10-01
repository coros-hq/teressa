/** Tells the server a component was copied, once per browser session so repeat clicks don't add up. */
export function trackCopy(slug: string) {
  try {
    const key = `copied:${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // no session storage: count it anyway
  }
  void fetch(`/api/copy/${encodeURIComponent(slug)}`, { method: "POST", keepalive: true }).catch(() => {});
}
