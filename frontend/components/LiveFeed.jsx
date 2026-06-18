/**
 * components/LiveFeed.jsx
 * -----------------------
 * 
 * Props:
 *   events    { type: "tool_call" | "tool_done" | "answer", content: string }[]
 *   isLoading boolean
 */

import { useEffect, useRef } from "react";
import styles from "../styles/LiveFeed.module.css";

const EVENT_LABELS = {
  tool_call : "CALLING TOOL",
  tool_done : "TOOL DONE",
  answer    : "REPORT",
};

export default function LiveFeed({ events, isLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.label}>LIVE AGENT ACTIVITY</div>
        {isLoading && (
          <div className={styles.thinking}>
            <span className={styles.dot} />
            <span className={styles.thinkingText}>thinking</span>
          </div>
        )}
      </div>

      <div className={styles.feed}>
        {events.length === 0 && (
          <div className={styles.empty}>
            Run a query to watch the agent work
          </div>
        )}

        {events.map((ev, i) => (
          <div key={i} className={`${styles.event} ${styles[ev.type]}`}>
            <div className={styles.eventType}>
              {EVENT_LABELS[ev.type] || ev.type}
            </div>
            <div className={styles.eventContent}>{ev.content}</div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
