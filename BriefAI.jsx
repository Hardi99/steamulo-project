import { useState, useRef } from "react";

const API_BASE = "http://localhost:3000";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,300;1,8..60,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink: #0f0e0d;
    --paper: #f5f0e8;
    --paper-dark: #ede7d9;
    --accent: #c8392b;
    --rule: #2a2520;
    --muted: #6b6057;
    --mono: 'IBM Plex Mono', monospace;
    --serif: 'Source Serif 4', Georgia, serif;
    --display: 'Playfair Display', Georgia, serif;
  }

  body { background: var(--paper); color: var(--ink); font-family: var(--serif); min-height: 100vh; }

  .app { max-width: 860px; margin: 0 auto; padding: 0 24px 80px; }

  .masthead {
    border-bottom: 4px double var(--rule);
    padding: 28px 0 16px;
    text-align: center;
  }
  .masthead::before { content: ''; display: block; border-top: 1px solid var(--rule); margin-bottom: 10px; }
  .masthead-date { font-family: var(--mono); font-size: 10px; letter-spacing: .15em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
  .masthead-title { font-family: var(--display); font-size: clamp(52px, 10vw, 86px); font-weight: 900; letter-spacing: -2px; line-height: 1; }
  .masthead-title span { color: var(--accent); }
  .masthead-tagline { font-family: var(--mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); margin-top: 10px; }
  .masthead-dots { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
  .masthead-dots::before, .masthead-dots::after { content: ''; flex: 1; height: 1px; background: var(--rule); }
  .dot { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; }

  .search-section { padding: 32px 0 24px; border-bottom: 1px solid var(--rule); }
  .search-label { font-family: var(--mono); font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; display: block; }
  .search-row { display: flex; border: 2px solid var(--ink); background: white; }
  .search-row input { flex: 1; border: none; outline: none; padding: 14px 18px; font-family: var(--serif); font-size: 17px; background: transparent; color: var(--ink); }
  .search-row input::placeholder { color: #b0a898; }
  .search-row button { border: none; border-left: 2px solid var(--ink); background: var(--ink); color: var(--paper); padding: 14px 28px; font-family: var(--mono); font-size: 12px; letter-spacing: .12em; text-transform: uppercase; cursor: pointer; transition: background .15s; white-space: nowrap; }
  .search-row button:hover:not(:disabled) { background: var(--accent); border-left-color: var(--accent); }
  .search-row button:disabled { opacity: .5; cursor: not-allowed; }

  .tone-row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  .tone-chip { font-family: var(--mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; padding: 5px 12px; border: 1px solid var(--rule); cursor: pointer; background: transparent; color: var(--muted); transition: all .15s; }
  .tone-chip.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }
  .tone-chip:hover:not(.active) { border-color: var(--ink); color: var(--ink); }

  .loading-block { padding: 48px 0; text-align: center; }
  .spinner { display: inline-block; width: 36px; height: 36px; border: 3px solid var(--paper-dark); border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-steps { display: flex; flex-direction: column; gap: 8px; align-items: center; }
  .loading-step { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; color: var(--muted); opacity: 0; animation: fadeUp .5s ease forwards; }
  .loading-step:nth-child(1) { animation-delay: .1s; }
  .loading-step:nth-child(2) { animation-delay: .9s; }
  .loading-step:nth-child(3) { animation-delay: 1.8s; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

  .output { animation: reveal .4s ease; }
  @keyframes reveal { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

  .brief-header { padding: 28px 0 20px; border-bottom: 2px solid var(--rule); }
  .kicker { font-family: var(--mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; }
  .headline { font-family: var(--display); font-size: clamp(26px, 5vw, 38px); font-weight: 700; line-height: 1.15; margin-bottom: 14px; }
  .meta-row { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
  .meta { font-family: var(--mono); font-size: 10px; letter-spacing: .1em; color: var(--muted); }
  .meta strong { color: var(--ink); }
  .badge { display: inline-flex; align-items: center; gap: 5px; background: #fef3cd; border: 1px solid #d4a017; color: #7a5800; font-family: var(--mono); font-size: 10px; letter-spacing: .08em; padding: 3px 10px; text-transform: uppercase; }

  .conf-row { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
  .conf-bar { flex: 1; height: 4px; background: var(--paper-dark); border-radius: 2px; overflow: hidden; }
  .conf-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width .8s ease; }
  .conf-pct { font-family: var(--mono); font-size: 10px; color: var(--muted); }

  .controversy-note { margin-top: 12px; padding: 10px 14px; background: #fef3cd; border-left: 3px solid #d4a017; font-size: 13px; color: #7a5800; font-family: var(--mono); }

  .brief-body { padding: 28px 0; border-bottom: 1px solid var(--paper-dark); font-size: 17px; line-height: 1.75; }
  .brief-body h1 { font-family: var(--display); font-size: 22px; margin: 24px 0 10px; }
  .brief-body h2 { font-family: var(--display); font-size: 19px; margin: 20px 0 10px; border-bottom: 1px solid var(--paper-dark); padding-bottom: 6px; }
  .brief-body h3 { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; margin: 20px 0 8px; color: var(--muted); }
  .brief-body p { margin-bottom: 14px; }
  .brief-body strong { font-weight: 700; }
  .brief-body em { font-style: italic; color: var(--muted); }
  .brief-body ul { list-style: none; margin: 12px 0 16px; }
  .brief-body li { padding: 8px 0 8px 20px; border-bottom: 1px solid var(--paper-dark); position: relative; font-size: 16px; }
  .brief-body li::before { content: '▸'; position: absolute; left: 0; color: var(--accent); }
  .brief-body blockquote { border-left: 3px solid var(--accent); margin: 18px 0; padding: 10px 20px; background: var(--paper-dark); font-style: italic; font-size: 16px; }

  .audio-section { padding: 20px 0; border-bottom: 1px solid var(--paper-dark); display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .audio-label { font-family: var(--mono); font-size: 10px; letter-spacing: .15em; text-transform: uppercase; color: var(--muted); white-space: nowrap; }
  .audio-wrap { flex: 1; min-width: 200px; }
  .audio-wrap audio { width: 100%; height: 36px; accent-color: var(--accent); }
  .dl-btn { font-family: var(--mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink); text-decoration: none; border: 1px solid var(--ink); padding: 8px 14px; transition: all .15s; white-space: nowrap; }
  .dl-btn:hover { background: var(--ink); color: var(--paper); }

  .sources-section { padding: 24px 0; }
  .sources-title { font-family: var(--mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
  .sources-title::after { content: ''; flex: 1; height: 1px; background: var(--paper-dark); }
  .source-item { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--paper-dark); }
  .source-num { font-family: var(--mono); font-size: 10px; color: var(--accent); min-width: 20px; padding-top: 2px; }
  .source-title { font-size: 14px; line-height: 1.4; margin-bottom: 3px; }
  .source-url { font-family: var(--mono); font-size: 10px; color: var(--muted); text-decoration: none; word-break: break-all; }
  .source-url:hover { color: var(--accent); }

  .error-box { margin: 32px 0; border: 2px solid var(--accent); padding: 20px 24px; background: #fff5f4; }
  .error-box h3 { font-family: var(--mono); font-size: 11px; letter-spacing: .15em; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
  .error-box p { font-size: 14px; color: var(--muted); }

  .footer { text-align: center; padding: 32px 0; border-top: 4px double var(--rule); margin-top: 40px; }
  .footer p { font-family: var(--mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }

  @media (max-width: 600px) {
    .search-row { flex-direction: column; }
    .search-row button { border-left: none; border-top: 2px solid var(--ink); }
    .audio-section { flex-direction: column; align-items: flex-start; }
  }
`;

function renderMarkdown(md) {
  if (!md) return "";
  return md
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^[\-\*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g, (m) => `<ul>${m}</ul>`)
    .replace(/<\/ul>\s*<ul>/g, "")
    .split(/\n{2,}/)
    .map((p) => {
      p = p.trim();
      if (!p) return "";
      if (/^<[hbu]/.test(p)) return p;
      return `<p>${p.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}

export default function BriefAI() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("analytique");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const tones = ["factuel", "analytique", "synthétique", "critique"];

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!topic.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/brief-with-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), tone }),
      });
      if (!res.ok) throw new Error(`Erreur serveur ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Impossible de joindre le serveur. Lancez d'abord `npm run dev`.");
    } finally {
      setLoading(false);
    }
  }

  const audioUrl = result?.audio_b64 ? `data:audio/mpeg;base64,${result.audio_b64}` : null;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* MASTHEAD */}
        <header className="masthead">
          <div className="masthead-date">{today}</div>
          <div className="masthead-title">Brief<span>AI</span></div>
          <div className="masthead-tagline">Votre journaliste personnel · Synthèse & Analyse</div>
          <div className="masthead-dots">
            <div className="dot" /><div className="dot" /><div className="dot" />
          </div>
        </header>

        {/* SEARCH */}
        <section className="search-section">
          <span className="search-label">Sujet à analyser</span>
          <form onSubmit={handleSubmit}>
            <div className="search-row">
              <input
                type="text"
                placeholder="ex : crise énergétique en Europe, intelligence artificielle…"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <button type="submit" disabled={loading || !topic.trim()}>
                {loading ? "En cours…" : "Générer"}
              </button>
            </div>
          </form>
          <div className="tone-row">
            {tones.map((t) => (
              <button key={t} className={`tone-chip${tone === t ? " active" : ""}`} onClick={() => setTone(t)} disabled={loading}>
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* LOADING */}
        {loading && (
          <div className="loading-block">
            <div className="spinner" />
            <div className="loading-steps">
              <div className="loading-step">↳ Consultation des sources d'actualité…</div>
              <div className="loading-step">↳ Analyse et synthèse journalistique…</div>
              <div className="loading-step">↳ Génération de l'audio…</div>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="error-box">
            <h3>⚠ Erreur de connexion</h3>
            <p>{error}</p>
          </div>
        )}

        {/* RESULT */}
        {result && (
          <div className="output">
            <div className="brief-header">
              <div className="kicker">Briefing · {tone}</div>
              <div className="headline">{topic}</div>
              <div className="meta-row">
                <span className="meta"><strong>{result.source_count}</strong> sources</span>
                <span className="meta">Confiance <strong>{Math.round(result.confidence_score * 100)}%</strong></span>
                <span className="meta">Modèle <strong>{result.model?.split("/").pop() ?? "—"}</strong></span>
                {result.controversy && <span className="badge">⚠ Controversé</span>}
              </div>
              <div className="conf-row">
                <div className="conf-bar">
                  <div className="conf-fill" style={{ width: `${result.confidence_score * 100}%` }} />
                </div>
                <span className="conf-pct">{Math.round(result.confidence_score * 100)}%</span>
              </div>
              {result.controversy && result.controversy_detail && (
                <div className="controversy-note">{result.controversy_detail}</div>
              )}
            </div>

            <div className="brief-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(result.brief) }} />

            <div className="audio-section">
              <span className="audio-label">🎙 Écouter</span>
              {audioUrl ? (
                <>
                  <div className="audio-wrap"><audio controls src={audioUrl} /></div>
                  <a href={audioUrl} download="brief.mp3" className="dl-btn">↓ MP3</a>
                </>
              ) : (
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#c0b0a0" }}>
                  Audio indisponible — ELEVENLABS_API_KEY manquante
                </span>
              )}
            </div>

            <div className="sources-section">
              <div className="sources-title">Sources consultées</div>
              {result.sources?.map((s, i) => (
                <div key={i} className="source-item">
                  <span className="source-num">{String(i + 1).padStart(2, "0")}.</span>
                  <div>
                    <div className="source-title">{s.title}</div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="source-url">{s.url}</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="footer">
          <p>BriefAI · Powered by Claude + Tavily + ElevenLabs</p>
        </footer>
      </div>
    </>
  );
}
