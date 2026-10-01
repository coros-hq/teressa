import { NotificationCard } from "./notification-card";

// Step 1: a canvas-style design scene. Someone draws a frame, drops in an avatar, adds text,
// drags in a button, and the code strip below follows along. Placeholder content only.
// At the end the finished card flies up into the shared canvas position (see the CSS timeline).

const CODE = [
  "<NotificationCard",
  "  avatar",
  '  title="New Comment"',
  '  from="DesignGuru22"',
  '  action="Mark As Read" />',
];

const ICON = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

// Simple tool glyphs, drawn from scratch: select, frame, shape, text, button.
const TOOLS = [
  <path key="select" d="M4 2.5 13 8l-4 1.2L7.2 13z" />,
  <path key="frame" d="M5.5 2v12M10.5 2v12M2 5.5h12M2 10.5h12" />,
  <circle key="shape" cx="8" cy="8" r="5" />,
  <path key="text" d="M3 4h10M8 4v9" />,
  <g key="button">
    <rect x="2" y="4.5" width="12" height="7" rx="3.5" />
    <path d="M6 8h4" />
  </g>,
];

// Property rows: label, value before, value after.
const ROWS = [
  { label: "Radius", from: "8", to: "16", cls: "r" },
  { label: "Padding", from: "12", to: "16", cls: "p" },
  { label: "Gap", from: "8", to: "12", cls: "g" },
];

const HANDLES = ["tl", "t", "tr", "l", "r", "bl", "b", "br"];

export function DesignStage() {
  return (
    <div className="ai-scene">
      <div className="ai-sc-panel">
        {ROWS.map((row) => (
          <div key={row.label} className="ai-sc-row">
            <span>{row.label}</span>
            <span className="ai-val">
              <span className={`ai-val-old ai-val-old-${row.cls}`}>{row.from}</span>
              <span className={`ai-val-new ai-val-new-${row.cls}`}>{row.to}</span>
            </span>
          </div>
        ))}
        <div className="ai-sc-row">
          <span>Fill</span>
          <span className="ai-val">
            <span className="ai-val-old ai-val-old-f">
              <i className="ai-sw ai-sw-none" />
              none
            </span>
            <span className="ai-val-new ai-val-new-f">
              <i className="ai-sw" />
              card
            </span>
          </span>
        </div>
      </div>

      <div className="ai-sc-frame">
        <NotificationCard />
        <span className="ai-sc-guide" />
        <span className="ai-sc-caret" />
        <span className="ai-sc-ring" />
        <span className="ai-sc-sel">
          {HANDLES.map((h) => (
            <i key={h} className={`ai-h ai-h-${h}`} />
          ))}
        </span>
      </div>

      <div className="ai-sc-tools">
        {TOOLS.map((glyph, i) => (
          <span key={i} className="ai-tool">
            <svg viewBox="0 0 16 16" width="16" height="16" {...ICON}>
              {glyph}
            </svg>
            <span className={`ai-tool-on ai-tool-on-${i + 1}`}>
              <svg viewBox="0 0 16 16" width="16" height="16" {...ICON}>
                {glyph}
              </svg>
            </span>
          </span>
        ))}
      </div>

      <div className="ai-sc-strip">
        <div className="ai-sc-view">
          <pre className="ai-sc-code">
            {CODE.map((line, i) => (
              <span key={i} className={`ai-sc-ln ai-sc-ln-${i + 1}`}>
                <i>{i + 1}</i>
                {line}
              </span>
            ))}
          </pre>
        </div>
      </div>

      <span className="ai-sc-cur">
        <svg viewBox="0 0 16 20" width="18" height="22">
          <path
            d="M1.5 1.2 14 8.6l-5.4 1.5-2.4 5.6z"
            fill="var(--secondary)"
            stroke="var(--background)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
        <span className="ai-sc-tags">
          <span className="ai-sc-tag">You</span>
          <span className="ai-sc-dim">
            <span className="ai-d1">96 × 18</span>
            <span className="ai-d2">192 × 36</span>
            <span className="ai-d3">288 × 54</span>
            <span className="ai-d4">384 × 72</span>
          </span>
        </span>
      </span>
    </div>
  );
}
