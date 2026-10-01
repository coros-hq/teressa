import { measureTarget, type DesignObject } from "./design-model";

type Side = "left" | "right" | "top" | "bottom";

// The red distance lines shown while you move or resize something: how far it is from each edge of
// what it sits in. Only sides with room are drawn.
export function MeasureLayer({
  objects,
  ids,
  zoom,
}: {
  objects: DesignObject[];
  ids: string[];
  zoom: number;
}) {
  const target = measureTarget(objects, ids);
  if (!target) return null;
  const { moved: m, ref: r } = target;
  const cx = m.x + m.width / 2;
  const cy = m.y + m.height / 2;

  const guides: { side: Side; dist: number; x1: number; y1: number; x2: number; y2: number }[] = [
    { side: "left", dist: m.x - r.x, x1: r.x, y1: cy, x2: m.x, y2: cy },
    { side: "right", dist: r.x + r.width - (m.x + m.width), x1: m.x + m.width, y1: cy, x2: r.x + r.width, y2: cy },
    { side: "top", dist: m.y - r.y, x1: cx, y1: r.y, x2: cx, y2: m.y },
    { side: "bottom", dist: r.y + r.height - (m.y + m.height), x1: cx, y1: m.y + m.height, x2: cx, y2: r.y + r.height },
  ];

  const line = 1 / zoom;
  const tick = 5 / zoom;
  const color = "var(--destructive)";

  return (
    <div className="pointer-events-none absolute top-0 left-0 z-[9]" aria-hidden="true">
      {/* The container being measured against. */}
      <div
        className="absolute"
        style={{
          left: r.x,
          top: r.y,
          width: r.width,
          height: r.height,
          boxShadow: `0 0 0 ${line}px color-mix(in srgb, var(--destructive) 55%, transparent)`,
        }}
      />
      <svg className="absolute top-0 left-0 overflow-visible" width={1} height={1}>
        {guides
          .filter((g) => g.dist > 0.5)
          .map((g) => {
            const horizontal = g.side === "left" || g.side === "right";
            return (
              <g key={g.side} stroke={color} strokeWidth={line}>
                <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />
                {/* Small caps at both ends, so it reads as a measurement. */}
                {horizontal ? (
                  <>
                    <line x1={g.x1} y1={g.y1 - tick} x2={g.x1} y2={g.y1 + tick} />
                    <line x1={g.x2} y1={g.y2 - tick} x2={g.x2} y2={g.y2 + tick} />
                  </>
                ) : (
                  <>
                    <line x1={g.x1 - tick} y1={g.y1} x2={g.x1 + tick} y2={g.y1} />
                    <line x1={g.x2 - tick} y1={g.y2} x2={g.x2 + tick} y2={g.y2} />
                  </>
                )}
              </g>
            );
          })}
      </svg>
      {guides
        .filter((g) => g.dist > 0.5)
        .map((g) => (
          <span
            key={g.side}
            data-measure={g.side}
            className="absolute rounded px-1 py-0.5 font-mono text-[11px] leading-none whitespace-nowrap text-white"
            style={{
              left: (g.x1 + g.x2) / 2,
              top: (g.y1 + g.y2) / 2,
              background: color,
              transform: `translate(-50%, -50%) scale(${1 / zoom})`,
            }}
          >
            {Math.round(g.dist)}
          </span>
        ))}
    </div>
  );
}
