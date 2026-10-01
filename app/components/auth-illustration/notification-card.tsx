// The one component the whole story is about. Each piece has its own class so the
// Design step can build it up piece by piece.
export function NotificationCard() {
  return (
    <div className="ai-nc">
      <svg className="ai-nc-avatar" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="20" fill="currentColor" opacity=".14" />
        <circle cx="20" cy="15.5" r="6.5" fill="currentColor" opacity=".55" />
        <path
          d="M6.5 34c1.6-6.2 7-9.2 13.5-9.2s11.9 3 13.5 9.2A20 20 0 0 1 6.5 34z"
          fill="currentColor"
          opacity=".55"
        />
      </svg>
      <div className="ai-nc-text">
        <p className="ai-nc-title">New Comment</p>
        <p className="ai-nc-sub">From DesignGuru22</p>
      </div>
      <span className="ai-nc-action">Mark As Read</span>
    </div>
  );
}
