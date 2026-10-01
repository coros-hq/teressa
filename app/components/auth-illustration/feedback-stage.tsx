// Step 3: a comment pops in next to the component, a reply follows, then the first is addressed.
// Invented names, no counts.
export function FeedbackStage() {
  return (
    <div className="ai-layer ai-layer-feedback">
      <div className="ai-bubble ai-b1">
        <span className="ai-av ai-av-a">S</span>
        <div className="ai-bubble-body">
          <p className="ai-name">Sol</p>
          <p>
            Add an aria-label here. Screen readers won&apos;t announce the
            icon-only state.
          </p>
          <span className="ai-addr">
            <span className="ai-addr-todo">Mark as addressed</span>
            <span className="ai-addr-done">✓ Addressed</span>
          </span>
        </div>
      </div>
      <div className="ai-bubble ai-b2">
        <span className="ai-av ai-av-b">M</span>
        <div className="ai-bubble-body">
          <p className="ai-name">Mina</p>
          <p>Good catch. I&apos;ll fix it in the next version.</p>
        </div>
      </div>
    </div>
  );
}
