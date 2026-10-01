import { useEffect, useRef, useState } from "react";

import { DesignStage } from "./design-stage";
import { FeedbackStage } from "./feedback-stage";
import { NotificationCard } from "./notification-card";
import { PublishStage } from "./publish-stage";
import "./auth-illustration.css";

// Drifting dots and soft circles behind the illustration. Decorative only.
export function AuthBackdrop() {
  const [tabHidden, setTabHidden] = useState(false);
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div
      className="ai-backdrop"
      data-paused={tabHidden || undefined}
      aria-hidden="true"
    >
      <div className="ai-dots-grid" />
      <i className="ai-orb ai-orb-1" />
      <i className="ai-orb ai-orb-2" />
      <i className="ai-orb ai-orb-3" />
    </div>
  );
}

// One continuous ~15s loop: Design, Publish, Get feedback. Decorative, so hidden from assistive tech
// and has nothing focusable. All timing lives in the CSS; this only pauses it when it can't be seen.
export function AuthIllustration() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [tabHidden, setTabHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    const onVisibility = () => setTabHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="ai-demo"
      data-paused={!inView || tabHidden || undefined}
      aria-hidden="true"
    >
      <div className="ai-float">
        <div className="ai-window">
          <div className="ai-bar">
            <span className="ai-dots">
              <i />
              <i />
              <i />
            </span>
            <span className="ai-file">
              <span className="ai-bar-file">notification-card.tsx</span>
              <span className="ai-bar-pub">● Published</span>
            </span>
          </div>
          <div className="ai-body">
            <div className="ai-canvas">
              <div className="ai-frame">
                <NotificationCard />
                <span className="ai-cardpin">S</span>
              </div>
            </div>
            <div className="ai-lower">
              <PublishStage />
              <FeedbackStage />
            </div>
            <DesignStage />
          </div>
        </div>
      </div>
      <div className="ai-shadow" />
    </div>
  );
}
