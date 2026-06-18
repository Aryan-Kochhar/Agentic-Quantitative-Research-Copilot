/**
 * components/EquityChart.jsx
 * Props:
 *   data  { date: string, value: number }[]
 */

import { useEffect, useRef } from "react";
import styles from "../styles/EquityChart.module.css";

export default function EquityChart({ data }) {
  const chartRef = useRef(null);
  const plotRef  = useRef(null);

  useEffect(() => {
    // Wait for container to have actual dimensions
    const container = chartRef.current;
    if (!container) return;

    import("plotly.js-dist-min").then((Plotly) => {
      const hasData = data && data.length > 0;

      // Don't render at all if no data — avoids broken empty chart
      if (!hasData) {
        if (plotRef.current) {
          Plotly.purge(container);
          plotRef.current = false;
        }
        return;
      }

      const x = data.map((d) => d.date);
      const y = data.map((d) => d.value);

      const trace = {
        x, y,
        type: "scatter",
        mode: "lines",
        name: "Portfolio",
        line: { color: "#EF9F27", width: 1.5 },
        fill: "tozeroy",
        fillcolor: "rgba(239,159,39,0.07)",
      };

      const layout = {
        paper_bgcolor: "transparent",
        plot_bgcolor:  "transparent",
        margin: { t: 10, r: 10, b: 40, l: 50 },
        xaxis: {
          color: "#6B7094",
          tickfont:  { family: "JetBrains Mono", size: 9 },
          gridcolor: "rgba(255,255,255,0.04)",
          showline:  false,
        },
        yaxis: {
          color: "#6B7094",
          tickfont:   { family: "JetBrains Mono", size: 9 },
          gridcolor:  "rgba(255,255,255,0.04)",
          tickformat: ".3f",
          showline:   false,
        },
        showlegend: false,
      };

      const config = { displayModeBar: false, responsive: true };

      if (plotRef.current) {
        Plotly.react(container, [trace], layout, config);
      } else {
        Plotly.newPlot(container, [trace], layout, config);
        plotRef.current = true;
      }
    });
  }, [data]);

  return (
    <div className={styles.card}>
      <div className={styles.label}>PORTFOLIO EQUITY CURVE</div>

      {(!data || data.length === 0) ? (
        <div className={styles.empty}>
          Run a backtest to see the equity curve
        </div>
      ) : (
        <div ref={chartRef} style={{ width: "100%", height: 340 }} />
      )}
    </div>
  );
}
