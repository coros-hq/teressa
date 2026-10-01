import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PreviewFrame, type PreviewApi, type PreviewStatus } from "./preview-frame";
import type { Rect } from "./preview-protocol";

// A component's live code preview, drawn inside the component. When `interactive`, a transparent
// layer sits over it: hover and click ask the sandboxed preview "what is at this point?" and the
// answer becomes an element selection. Copies inside instances are not interactive.
export function LivePreview({
  objectId,
  code,
  theme,
  zoom,
  restartKey,
  interactive,
  canPick,
  selectedSid,
  selectedTag,
  cursor,
  onStatus,
  onPick,
}: {
  objectId: string;
  /** The code, with an id added to every element. */
  code: string;
  theme: "light" | "dark";
  zoom: number;
  restartKey: number;
  interactive: boolean;
  canPick: boolean;
  selectedSid: number | null;
  selectedTag: string | null;
  cursor: string;
  onStatus: (id: string, status: PreviewStatus) => void;
  /** The element under a click, or null when nothing was hit. */
  onPick: (objectId: string, sid: number | null) => void;
}) {
  const [status, setStatus] = useState<PreviewStatus>({ kind: "starting" });
  const [renderTick, setRenderTick] = useState(0);
  const [hover, setHover] = useState<{ sid: number; rect: Rect } | null>(null);
  const [selRect, setSelRect] = useState<Rect | null>(null);
  const api = useRef<PreviewApi | null>(null);
  const busy = useRef(false);

  const toFrame = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
  };

  // Keep the element outline on its element after edits, resizes and re-renders.
  useEffect(() => {
    let live = true;
    if (selectedSid === null || !api.current) {
      setSelRect(null);
      return;
    }
    void api.current.measure(selectedSid).then((r) => live && setSelRect(r));
    return () => {
      live = false;
    };
  }, [selectedSid, renderTick]);

  const outline = 1.5 / zoom;

  return (
    <>
      <PreviewFrame
        code={code}
        theme={theme}
        onStatus={(s) => {
          setStatus(s);
          onStatus(objectId, s);
          if (s.kind === "ready") setRenderTick((n) => n + 1);
        }}
        restartKey={restartKey}
        apiRef={interactive ? api : undefined}
        className="pointer-events-none absolute inset-0 size-full border-0"
      />
      {interactive && (
        <div
          className="absolute inset-0 z-[1]"
          style={{ cursor }}
          onPointerMove={async (e) => {
            if (!canPick || busy.current || !api.current) return;
            const { x, y } = toFrame(e);
            busy.current = true;
            const hit = await api.current.hit(x, y);
            busy.current = false;
            setHover(hit);
          }}
          onPointerLeave={() => setHover(null)}
          onClick={async (e) => {
            if (!canPick || e.button !== 0 || !api.current) return;
            const { x, y } = toFrame(e);
            const hit = await api.current.hit(x, y);
            onPick(objectId, hit ? hit.sid : null);
          }}
        >
          {hover && hover.sid !== selectedSid && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: hover.rect.x,
                top: hover.rect.y,
                width: hover.rect.width,
                height: hover.rect.height,
                boxShadow: `inset 0 0 0 ${outline}px color-mix(in srgb, var(--secondary) 70%, transparent)`,
              }}
            />
          )}
          {selectedSid !== null && selRect && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: selRect.x,
                top: selRect.y,
                width: selRect.width,
                height: selRect.height,
                boxShadow: `0 0 0 ${outline}px var(--secondary)`,
              }}
            >
              <span
                className="bg-secondary text-secondary-foreground absolute bottom-full left-0 mb-1 origin-bottom-left rounded px-1.5 py-0.5 font-mono text-[11px] leading-none whitespace-nowrap"
                style={{ transform: `scale(${1 / zoom})` }}
              >
                {selectedTag}
              </span>
            </div>
          )}
        </div>
      )}
      {status.kind === "starting" && (
        <div
          role="status"
          className="text-muted-foreground bg-background/80 absolute inset-0 z-[2] grid place-items-center text-sm"
        >
          <span className="flex items-center gap-2" style={{ transform: `scale(${1 / zoom})` }}>
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
            Starting preview
          </span>
        </div>
      )}
    </>
  );
}
