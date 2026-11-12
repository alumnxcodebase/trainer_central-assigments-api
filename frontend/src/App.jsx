import { useCallback, useEffect, useState } from "react";

// Production build is served by the API itself -> same origin
const API = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:8000");

export default function App() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, top_senders: [], per_day: [] });
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      const [e, s] = await Promise.all([
        fetch(`${API}/api/entries?limit=100&q=${encodeURIComponent(q)}`).then((r) => r.json()),
        fetch(`${API}/api/stats`).then((r) => r.json()),
      ]);
      setItems(e.items);
      setTotal(e.total);
      setStats(s);
      setError("");
      setUpdated(new Date());
    } catch {
      setError(`Cannot reach API at ${API}`);
    }
  }, [q]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // live refresh
    return () => clearInterval(t);
  }, [load]);

  const maxDay = Math.max(1, ...stats.per_day.map((d) => d.count));

  return (
    <div className="wrap">
      <header>
        <h1>Text Dashboard</h1>
        <span className="muted">
          {error ? <b className="err">{error}</b> : updated && `Live · updated ${updated.toLocaleTimeString()}`}
        </span>
      </header>

      <section className="cards">
        <div className="card"><div className="num">{stats.total}</div><div className="muted">Total messages</div></div>
        <div className="card"><div className="num">{stats.top_senders.length}</div><div className="muted">Senders</div></div>
        <div className="card"><div className="num">{stats.per_day.at(-1)?.count ?? 0}</div><div className="muted">Latest active day</div></div>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>Messages per day</h2>
          <div className="bars">
            {stats.per_day.map((d) => (
              <div key={d.date} className="barcol" title={`${d.date}: ${d.count}`}>
                <div className="bar" style={{ height: `${(d.count / maxDay) * 100}%` }} />
                <small>{d.date.slice(5)}</small>
              </div>
            ))}
            {!stats.per_day.length && <p className="muted">No data yet</p>}
          </div>
        </div>
        <div className="panel">
          <h2>Top senders</h2>
          {stats.top_senders.map((s) => (
            <div key={s.sender} className="row"><span>{s.sender}</span><b>{s.count}</b></div>
          ))}
          {!stats.top_senders.length && <p className="muted">No data yet</p>}
        </div>
      </section>

      <section className="panel">
        <div className="head">
          <h2>Messages ({total})</h2>
          <input placeholder="Search text…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <table>
          <thead><tr><th>Time</th><th>Sender</th><th>Text</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td className="nowrap">{new Date(i.created_at).toLocaleString()}</td>
                <td>{i.sender}</td>
                <td className="text">{i.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <p className="muted">Nothing yet. Send some text to the API.</p>}
      </section>
    </div>
  );
}
