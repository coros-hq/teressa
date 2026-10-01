/** A same-site path to send someone to after signing in. Anything else (other sites, odd schemes) becomes the fallback. */
export function safeNextPath(raw: string | null | undefined, fallback = "/overview"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || /[\u0000-\u001f]/.test(raw)) return fallback;
  return raw;
}
