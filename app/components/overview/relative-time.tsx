import { formatRelative } from "~/lib/format-time";

// "2 hours ago", with the exact time one hover (or screen reader) away. The text depends on the
// current time, so the server's and the browser's versions can differ by a moment; that is fine.
export function RelativeTime({ iso, prefix = "" }: { iso: string; prefix?: string }) {
  const exact = new Date(iso);
  if (Number.isNaN(exact.getTime())) return null;
  return (
    <time dateTime={exact.toISOString()} title={exact.toLocaleString()} suppressHydrationWarning>
      {prefix}
      {formatRelative(iso)}
    </time>
  );
}
