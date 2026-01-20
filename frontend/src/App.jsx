import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [health, setHealth] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const healthRes = await axios.get("/api/health");
        setHealth(healthRes.data.status);

        const kpiRes = await axios.get("/api/kpis");
        setKpis(kpiRes.data);
      } catch (err) {
        setError("Failed to connect to backend");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div className="container">Loading…</div>;
  if (error) return <div className="container error">{error}</div>;

  return (
    <div className="container">
      <h1>StreamSense Reactor</h1>

      <section className="card">
        <h2>Service Health</h2>
        <p className={health === "ok" ? "ok" : "bad"}>
          {health === "ok" ? "Backend is healthy" : "Backend issue"}
        </p>
      </section>

      <section className="card">
        <h2>Recent KPIs</h2>
        {kpis.length === 0 ? (
          <p>No data yet</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Minute</th>
                <th>Service</th>
                <th>Count</th>
                <th>Avg Latency (ms)</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.minute_bucket}</td>
                  <td>{row.service}</td>
                  <td>{row.event_count}</td>
                  <td>{Math.round(row.avg_latency_ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default App;
