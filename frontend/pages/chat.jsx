/**
 * pages/chat.jsx
 * --------------
 * Full terminal UI — matches landing page aesthetic.
 * GridBackground gives the black + amber grid canvas.
 * All panels are glassmorphism cards over the dark bg.
 */

import Head from "next/head";
import dynamic from "next/dynamic";
import Link from "next/link";
import QueryInput   from "../components/QueryInput";
import LiveFeed     from "../components/LiveFeed";
import EquityChart  from "../components/EquityChart";
import BacktestPanel from "../components/BacktestPanel";
import { useQuantCopilot } from "../hooks/useQuantCopilot";
import styles from "../styles/Chat.module.css";

const GridBackground = dynamic(() => import("../components/GridBackground"), { ssr: false });

export default function Chat() {
  const { events, equityData, isLoading, error, submitQuery, runBacktest } = useQuantCopilot();

  return (
    <>
      <Head>
        <title>Quant Copilot — Terminal</title>
        <meta name="description" content="Agentic Quant Research Terminal" />
      </Head>

      <GridBackground />

      <div className={styles.page}>

        {/* Header */}
        <header className={styles.header}>
          <Link href="/" className={styles.logoWrap}>
            <div className={styles.logoMark} />
            <div>
              <div className={styles.logoName}>QUANT COPILOT</div>
              <div className={styles.logoSub}>AGENTIC RESEARCH TERMINAL</div>
            </div>
          </Link>
          <div className={styles.headerRight}>
            <div className={styles.statusDot} />
            <span className={styles.statusTxt}>CONNECTED</span>
          </div>
        </header>

        {/* Main content */}
        <main className={styles.main}>
          <div className={styles.container}>

            <QueryInput onSubmit={submitQuery} isLoading={isLoading} />

            <BacktestPanel onRun={runBacktest} isLoading={isLoading} />

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.grid}>
              <LiveFeed events={events} isLoading={isLoading} />
              <EquityChart data={equityData} />
            </div>

          </div>
        </main>

      </div>
    </>
  );
}
