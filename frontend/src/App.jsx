import { useCallback, useEffect, useState } from "react";

// Production build is served by the API itself -> same origin
const API = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:8000");

export default function App() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/learners`).then((r) => r.json());
      setItems(r.items);
      setError("");
      setUpdated(new Date());
    } catch {
      setError(`Cannot reach API at ${API || "this server"}`);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // live refresh
    return () => clearInterval(t);
  }, [load]);

  const shown = items.filter((i) => i.learner.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="wrap">
      <header>
        <h1>Assignment Dashboard</h1>
        <span className="muted">
          {error ? <b className="err">{error}</b> : updated && `Live · updated ${updated.toLocaleTimeString()}`}
        </span>
      </header>

      <section className="cards">
        <div className="card"><div className="num">{items.length}</div><div className="muted">Learners done</div></div>
      </section>

      <section className="panel">
        <div className="head">
          <h2>Learners</h2>
          <input placeholder="Search name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <table>
          <thead><tr><th>#</th><th>Learner</th><th>Status</th><th>Submitted</th></tr></thead>
          <tbody>
            {shown.map((i, n) => (
              <tr key={i.learner}>
                <td>{n + 1}</td>
                <td>{i.learner}</td>
                <td><span className="done">✓ Assignment done</span></td>
                <td className="nowrap">{new Date(i.last).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="muted">No submissions yet.</p>}
      </section>
    </div>
  );
}
