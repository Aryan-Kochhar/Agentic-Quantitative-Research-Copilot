/**
 * pages/index.jsx
 * ---------------
 * Main page 
 */

import Head from "next/head";
import QueryInput  from "../components/QueryInput";
import LiveFeed    from "../components/LiveFeed";
import EquityChart from "../components/EquityChart";
import { useQuantCopilot } from "../hooks/useQuantCopilot";
import styles from "../styles/Home.module.css";
import BacktestPanel from "../components/BacktestPanel";

export default function Home() {
  const {
    events,
    equityData,
    isLoading,
    error,
    submitQuery,
    runBacktest,
  } = useQuantCopilot();

  return (
    <>
      <Head>
        <title>Quant Copilot</title>
        <meta name="description" content="Agentic Quant Research Terminal" />
      </Head>

      <main className={styles.main}>
        <div className={styles.container}>

          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.title}>Quant Copilot</h1>
            <span className={styles.subtitle}>AGENTIC RESEARCH TERMINAL</span>
          </div>

          {/* Query Input */}
          <QueryInput onSubmit={submitQuery} isLoading={isLoading} />
          <BacktestPanel onRun={runBacktest} isLoading={isLoading} />
          

          {/* Error */}
          {error && (
            <div className={styles.error}>{error}</div>
          )}

          {/* Grid */}
          <div className={styles.grid}>
            <LiveFeed events={events} isLoading={isLoading} />
            <EquityChart data={equityData} />
          </div>

        </div>
      </main>
    </>
  );
}
