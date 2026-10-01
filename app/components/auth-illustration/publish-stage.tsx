// Step 2: checks tick one by one, a cursor clicks Publish, and it becomes Published.
const CHECKS = [
  "TypeScript compiles",
  "Accessibility check passes",
  "Uses theme tokens, no hardcoded colors",
];

export function PublishStage() {
  return (
    <div className="ai-layer ai-layer-checks">
      <p className="ai-head">Before you publish</p>
      <ul className="ai-checks">
        {CHECKS.map((label, i) => (
          <li key={label}>
            <span className="ai-tick">
              <span className={`ai-tick-fill ai-tick-${i + 1}`}>
                <svg
                  viewBox="0 0 12 12"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6.4l2.1 2.1L9 4.4" />
                </svg>
              </span>
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <span className="ai-pub">
        <span className="ai-pub-todo">Publish</span>
        <span className="ai-pub-done">
          <svg
            viewBox="0 0 12 12"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6.4l2.1 2.1L9 4.4" />
          </svg>
          Published
        </span>
      </span>
      <svg className="ai-cursor" viewBox="0 0 16 20" width="20" height="25">
        <path
          d="M1.5 1.2 14 8.6l-5.4 1.5-2.4 5.6z"
          fill="var(--foreground)"
          stroke="var(--background)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
