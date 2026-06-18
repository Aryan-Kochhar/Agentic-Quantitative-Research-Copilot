/**
 * components/QueryInput.jsx
 * -------------------------
 * 
 * Props:
 *   onSubmit  (query: string) => void
 *   isLoading boolean
 */

import { useState } from "react";
import styles from "../styles/QueryInput.module.css";


export default function QueryInput({ onSubmit, isLoading }) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className={styles.card}>
      <div className={styles.label}>RESEARCH QUERY</div>
      <div className={styles.row}>
        <input
          className={styles.input}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What is the max drawdown of MSFT over the last year?"
          disabled={isLoading}
        />
        <button
          className={styles.button}
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? "RUNNING..." : "ANALYSE →"}
        </button>
      </div>
    </div>
  );
}
