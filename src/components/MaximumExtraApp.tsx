"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FilePlus2,
  Flag,
  FolderPlus,
  Globe2,
  History,
  Info,
  Lightbulb,
  ListPlus,
  Menu,
  MessageCircleQuestion,
  Moon,
  Save,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { CHAOS_LABELS, UNIVERSE_LABELS, chaosBand } from "@/lib/chaos-engine";
import type { ActionResult, Audience, CaseAction, CaseSummary, ExcuseState, Genre, LoreObject, UserRole } from "@/lib/types";

type Theme = "light" | "dark";

const examples = [
  { label: "Missed a deadline", value: "I need an excuse for missing my assignment." },
  { label: "Can’t make plans", value: "I need to cancel plans with a friend at the last minute." },
  { label: "Running late", value: "I am running late for a meeting and need to explain why." },
] as const;

const audienceLabels: Record<Audience, string> = {
  teacher: "Teacher",
  parent: "Parent",
  boss: "Boss",
  friend: "Friend",
};

const roleLabels: Record<UserRole, string> = { student: "Student", adult: "Adult" };
const genreLabels: Record<Genre, string> = {
  normal: "Normal",
  corporate: "Corporate",
  nature_documentary: "Nature documentary",
  action_movie: "Action movie",
};

function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const saved = window.localStorage.getItem("maximum-extra-theme") as Theme | null;
    const preferred = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = preferred;
    const frame = window.requestAnimationFrame(() => setTheme(preferred));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("maximum-extra-theme", next);
  };
  return { theme, toggle };
}

function AppHeader({
  state,
  theme,
  onToggleTheme,
  onNewCase,
  onHistory,
  onMenu,
}: {
  state: ExcuseState | null;
  theme: Theme;
  onToggleTheme: () => void;
  onNewCase: () => void;
  onHistory: () => void;
  onMenu: () => void;
}) {
  return (
    <header className="app-header">
      <button className="mobile-menu icon-button" onClick={onMenu} aria-label="Open menu"><Menu /></button>
      <button className="wordmark" onClick={onNewCase} aria-label="Maximum Extra home">MAXIMUM EXTRA</button>
      {state && (
        <>
          <span className="header-divider" aria-hidden="true" />
          <span className="case-number">CASE #{String(state.caseNumber).padStart(3, "0")}</span>
          <span className="header-divider" aria-hidden="true" />
          <span className="chaos-status"><span className="status-dot" /> CHAOS {state.chaosLevel}</span>
        </>
      )}
      <nav className="header-actions" aria-label="Case actions">
        <button className="theme-toggle icon-button" onClick={onToggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
          {theme === "light" ? <Moon /> : <Sun />}
        </button>
        <button className="header-primary" onClick={onNewCase}><FilePlus2 /> New case</button>
        <button className="header-link" onClick={onHistory}><History /> History</button>
      </nav>
    </header>
  );
}

function SafetyBar({ critical = false }: { critical?: boolean }) {
  return (
    <details className={`safety-bar ${critical ? "safety-critical" : ""}`}>
      <summary>
        {critical ? <AlertTriangle /> : <Info />}
        <span className="safety-summary">
          {critical ? <strong>System alert: Maximum Extra chaos level reached.</strong> : "For entertainment and creative roleplay."}
          <span className="safety-long"> Don’t invent real emergencies, crimes, medical claims, or impersonate anyone.</span>
        </span>
        <span className="safety-link">Safety <ChevronDown /></span>
      </summary>
      <p>Keep scenarios fictional and harmless. Maximum Extra will not create fake evidence, official documents, financial fraud, or serious emergency claims.</p>
    </details>
  );
}

function ThemeShell({
  state,
  children,
  liveMessage,
  onNewCase,
  onHistory,
}: {
  state: ExcuseState | null;
  children: React.ReactNode;
  liveMessage: string;
  onNewCase: () => void;
  onHistory: () => void;
}) {
  const { theme, toggle } = useTheme();
  const [mobileMenu, setMobileMenu] = useState(false);
  const critical = Boolean(state && state.chaosLevel >= 8);
  return (
    <div className="app-shell" data-chaos={state ? chaosBand(state.chaosLevel) : "calm"}>
      <AppHeader state={state} theme={theme} onToggleTheme={toggle} onNewCase={onNewCase} onHistory={onHistory} onMenu={() => setMobileMenu((value) => !value)} />
      {mobileMenu && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button onClick={() => { onNewCase(); setMobileMenu(false); }}><FilePlus2 /> New case</button>
          <button onClick={() => { onHistory(); setMobileMenu(false); }}><History /> History</button>
          <button onClick={() => { toggle(); setMobileMenu(false); }}>{theme === "light" ? <Moon /> : <Sun />} {theme === "light" ? "Dark" : "Light"} theme</button>
        </nav>
      )}
      <SafetyBar critical={critical} />
      <div className="sr-only" aria-live="polite" aria-atomic="true">{liveMessage}</div>
      {children}
    </div>
  );
}

function CreationView({
  recentCases,
  onCreate,
  onOpen,
  busy,
}: {
  recentCases: CaseSummary[];
  onCreate: (input: { scenario: string; audience: Audience; userRole: UserRole; genre: Genre; startingChaos: number }) => Promise<void>;
  onOpen: (id: string) => void;
  busy: boolean;
}) {
  const [scenario, setScenario] = useState<string>(examples[0].value);
  const [audience, setAudience] = useState<Audience>("teacher");
  const [userRole, setUserRole] = useState<UserRole>("student");
  const [genre, setGenre] = useState<Genre>("normal");
  const [startingChaos, setStartingChaos] = useState(1);
  const [error, setError] = useState("");
  const scenarioId = useId();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (scenario.trim().length < 8) {
      setError("Describe the situation in at least eight characters.");
      return;
    }
    setError("");
    await onCreate({ scenario, audience, userRole, genre, startingChaos });
  }

  return (
    <main className="creation-layout">
      <form className="creation-form" onSubmit={submit}>
        <h1>What’s your situation?</h1>
        <div className="field-group">
          <label htmlFor={scenarioId}>Describe the situation</label>
          <textarea id={scenarioId} value={scenario} onChange={(event) => setScenario(event.target.value.slice(0, 500))} aria-describedby={`${scenarioId}-hint ${error ? `${scenarioId}-error` : ""}`} />
          <div className="field-meta" id={`${scenarioId}-hint`}><span>Describe the harmless situation. Don’t include real names or sensitive personal details.</span><span>{scenario.length} / 500</span></div>
          {error && <p className="field-error" id={`${scenarioId}-error`} role="alert">{error}</p>}
        </div>
        <div className="field-row">
          <label>Who are you explaining it to?
            <select value={audience} onChange={(event) => setAudience(event.target.value as Audience)}>
              {Object.entries(audienceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Who are you?
            <select value={userRole} onChange={(event) => setUserRole(event.target.value as UserRole)}>
              {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="field-row">
          <fieldset className="chaos-choice">
            <legend>Starting chaos <Info aria-label="Choose how unusual the first excuse should be" /></legend>
            <div className="segmented-control">
              {[0, 1, 2, 3].map((level) => (
                <label key={level} className={startingChaos === level ? "selected" : ""}>
                  <input type="radio" name="starting-chaos" value={level} checked={startingChaos === level} onChange={() => setStartingChaos(level)} />
                  <strong>{level}</strong><span>{level === 0 ? "Normal" : level === 1 ? "Mildly unusual" : level === 2 ? "Suspicious" : "Dramatic"}</span>
                </label>
              ))}
            </div>
            <small>You can always make it worse later.</small>
          </fieldset>
          <label>Genre (optional)
            <select value={genre} onChange={(event) => setGenre(event.target.value as Genre)}>
              {Object.entries(genreLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <small>Keeps the tone controlled while the chaos rises.</small>
          </label>
        </div>
        <button className="generate-button" type="submit" disabled={busy}>{busy ? <><Sparkles className="spin" /> Generating…</> : <>Generate excuse <ArrowRight /></>}</button>
        <div className="example-divider"><span>Or try an example</span></div>
        <div className="example-buttons">
          {examples.map((example) => <button type="button" key={example.label} onClick={() => setScenario(example.value)}><FilePlus2 /> {example.label}</button>)}
        </div>
        <p className="privacy-note"><ShieldCheck /> Cases are linked to this browser. No account required.</p>
      </form>
      <aside className="recent-cases" aria-labelledby="recent-cases-title">
        <h2 id="recent-cases-title">Recent cases</h2>
        {recentCases.length === 0 ? (
          <div className="empty-history"><Clock3 /><p>Your saved cases will appear here.</p></div>
        ) : recentCases.slice(0, 6).map((item) => (
          <button key={item.id} className="case-row" onClick={() => onOpen(item.id)}>
            <BookOpen />
            <span><strong>CASE #{String(item.caseNumber).padStart(3, "0")}</strong><small>{item.title}</small><small>Chaos {item.chaosLevel} · {new Date(item.updatedAt).toLocaleDateString()}</small></span>
            <ChevronRight />
          </button>
        ))}
      </aside>
      <p className="progressive-hint"><Info /> The interface changes as chaos rises.</p>
    </main>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-row">
      <div><span>{label}</span><strong>{value}%</strong></div>
      <div className="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function DnaPanel({ state }: { state: ExcuseState }) {
  const { metrics } = state;
  return (
    <aside className="insights-panel">
      <section aria-labelledby="dna-heading">
        <h2 id="dna-heading">Excuse DNA <Info /></h2>
        <MetricBar label="Believability" value={metrics.believability} />
        <MetricBar label="Unhingedness" value={metrics.unhingedness} />
        <MetricBar label="Suspicion" value={metrics.suspicion} />
        <MetricBar label="Lore density" value={metrics.loreDensity} />
        <MetricBar label="Commitment" value={metrics.commitment} />
      </section>
      <section className="lore-panel" aria-labelledby="lore-heading">
        <h2 id="lore-heading">Active lore <Info /></h2>
        {state.lore.length === 0 ? (
          <div className="empty-lore"><BookOpen /><p>No recurring characters<br />or events yet.</p></div>
        ) : (
          <div className="lore-list">
            {state.lore.map((item) => <LoreItem key={item.id} item={item} />)}
          </div>
        )}
        {state.chaosLevel >= 6 && <p className="lore-warning"><AlertTriangle /> Lore instability</p>}
      </section>
    </aside>
  );
}

function LoreItem({ item }: { item: LoreObject }) {
  const icon = item.type === "character" ? <UserRound /> : item.type === "organization" ? <UsersRound /> : item.type === "object" ? <Bookmark /> : <BookOpen />;
  return <div className="lore-item">{icon}<span><strong>{item.name}</strong><small>{item.role}</small></span></div>;
}

function CaseRail({ state, collapsed, onToggle }: { state: ExcuseState; collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className={`case-rail ${collapsed ? "collapsed" : ""}`}>
      <button className="rail-toggle icon-button" onClick={onToggle} aria-label={collapsed ? "Show case state" : "Hide case state"}>{collapsed ? <ChevronRight /> : <ArrowLeft />}</button>
      {!collapsed && (
        <>
          <section><span className="eyebrow">Original situation</span><p>{state.scenario.text}</p></section>
          <section className="case-facts">
            <div><span>Audience</span><strong>{audienceLabels[state.scenario.audience]}</strong></div>
            <div><span>Role</span><strong>{roleLabels[state.scenario.userRole]}</strong></div>
            <div><span>Genre</span><strong>{genreLabels[state.genre]}</strong></div>
          </section>
          <section className="chaos-scale">
            <span className="eyebrow">Chaos level <Info /></span>
            <div className="scale-numbers">{Array.from({ length: 11 }, (_, index) => <span key={index} className={index === state.chaosLevel ? "active" : ""}>{index}</span>)}</div>
            <div className="scale-line"><span style={{ width: `${state.chaosLevel * 10}%` }} /></div>
            <strong>{state.chaosLevel} — {CHAOS_LABELS[state.chaosLevel]}</strong>
          </section>
          <section className="universe-scope"><span className="eyebrow">Universe scope</span><p><Globe2 /> {UNIVERSE_LABELS[state.universeLevel]}</p></section>
          {state.chaosLevel >= 6 && state.lore.some((item) => item.name === "Raymond") && <p className="raymond-detected"><AlertTriangle /> Raymond detected</p>}
        </>
      )}
    </aside>
  );
}

function WorkspaceView({ state, busy, onAction }: { state: ExcuseState; busy: boolean; onAction: (action: CaseAction) => void }) {
  const [railCollapsed, setRailCollapsed] = useState(false);
  const critical = state.chaosLevel >= 8;
  return (
    <main className="workspace">
      <details className="mobile-case-summary">
        <summary><span><strong>Chaos {state.chaosLevel}</strong> · {audienceLabels[state.scenario.audience]} · {roleLabels[state.scenario.userRole]}</span><ChevronDown /></summary>
        <p>{state.scenario.text}</p>
      </details>
      <div className="workspace-grid">
        <CaseRail state={state} collapsed={railCollapsed} onToggle={() => setRailCollapsed((value) => !value)} />
        <section className="excuse-workspace" aria-labelledby="current-excuse-title">
          <div className="document-heading"><h1 id="current-excuse-title">Your current excuse</h1><span>v.{String(state.version).padStart(2, "0")}</span></div>
          <article className="excuse-document">
            <p>{state.currentExcuse}</p>
            {critical && <span className="reality-stamp">Reality error</span>}
          </article>
          {state.finalJudgment ? (
            <section className="final-judgment"><Sparkles /><span><small>Final AI judgment</small><strong>{state.finalJudgment}</strong></span></section>
          ) : (
            <div className="action-grid">
              <button className="make-worse" disabled={busy} onClick={() => onAction({ type: "make_worse" })}><Zap /> {busy ? "Making it worse…" : "Make it worse"}</button>
              <button disabled={busy} onClick={() => onAction({ type: "add_lore" })}><FolderPlus /> Add lore</button>
              <button disabled={busy} onClick={() => onAction({ type: "add_detail" })}><ListPlus /> Add detail</button>
              <button disabled={busy} onClick={() => onAction({ type: "escalate_universe" })}><Globe2 /> Escalate universe</button>
              <button disabled={busy} onClick={() => onAction({ type: "begin_interrogation" })}><MessageCircleQuestion /> Interrogate me</button>
              <button disabled={busy} onClick={() => onAction({ type: "save_case" })}><Save /> {state.status === "saved" ? "Case saved" : "Save case"}</button>
            </div>
          )}
        </section>
        <DnaPanel state={state} />
      </div>
      {critical && <div className="chaos-ticker"><strong>LIVE</strong><span>Raymond sighted near coastal aquarium facility</span><span>Bus status: non-vehicular</span><span>Jurisdiction: aquatic</span></div>}
      <Recommendation state={state} />
    </main>
  );
}

function Recommendation({ state }: { state: ExcuseState }) {
  return <footer className="recommendation"><Sparkles /><p><strong>AI recommendation:</strong> {state.recommendation}</p><span>The interface changes as chaos rises. <Info /></span></footer>;
}

function InterrogationView({ state, busy, onAction }: { state: ExcuseState; busy: boolean; onAction: (action: CaseAction) => void }) {
  const interrogation = state.interrogation;
  const [answer, setAnswer] = useState("");
  if (!interrogation) return null;
  const evidence = state.lore.slice(0, 3);
  const questionNumber = interrogation.questionNumber;
  return (
    <main className="interrogation-view">
      <aside className="interrogation-rail">
        <span className="eyebrow">Original situation</span><p>{state.scenario.text}</p>
        <div><span className="eyebrow">Adversary</span><strong><UserRound /> {audienceLabels[state.scenario.audience]}</strong></div>
        <div><span className="eyebrow">You are</span><strong><UserRound /> {roleLabels[state.scenario.userRole]}</strong></div>
        <div className="interrogation-chaos">Chaos level {state.chaosLevel} / {CHAOS_LABELS[state.chaosLevel]}</div>
        <span className="eyebrow">Active lore</span>
        {state.lore.slice(0, 3).map((item) => <LoreItem key={item.id} item={item} />)}
        <button onClick={() => onAction({ type: "retreat" })}><ArrowLeft /> Back to excuse</button>
      </aside>
      <section className="interrogation-main">
        <div className="interrogation-heading"><div><h1>{audienceLabels[state.scenario.audience]} interrogation</h1><p>Question {questionNumber} of 5</p></div><span>Difficulty <strong>{interrogation.difficulty}</strong></span></div>
        <div className="question-progress" aria-label={`Question ${questionNumber} of 5`}>
          {[1, 2, 3, 4, 5].map((number) => <span key={number} className={number < questionNumber ? "complete" : number === questionNumber ? "current" : ""}>{number < questionNumber ? <Check /> : number}</span>)}
        </div>
        <div className="evidence-trail"><span className="eyebrow">Evidence trail</span><div>{(evidence.length ? evidence : [{ id: "base", type: "event" as const, name: "Transport delay", role: "Claim", description: "", importance: 0.5 }]).map((item) => <div key={item.id}><BookOpen /> {item.name}</div>)}</div></div>
        <blockquote>{interrogation.currentQuestion}</blockquote>
        <label className="answer-field">Your answer
          <textarea value={answer} onChange={(event) => setAnswer(event.target.value.slice(0, 1000))} placeholder="Defend your timeline…" />
          <span>{answer.length} / 1000</span>
        </label>
        <div className="answer-actions">
          <button className="submit-answer" disabled={busy || answer.trim().length < 2} onClick={() => { onAction({ type: "answer_interrogation", answer }); setAnswer(""); }}>Submit answer <ArrowRight /></button>
          <button disabled={busy} onClick={() => onAction({ type: "retreat" })}>Retreat and tell the truth <Flag /></button>
        </div>
      </section>
      <aside className="interrogation-insights">
        <section className="suspicion-card"><span>Suspicion</span><strong>{state.metrics.suspicion}%</strong><div className="meter"><span style={{ width: `${state.metrics.suspicion}%` }} /></div><p>{state.metrics.suspicion > 80 ? "High suspicion" : "Building suspicion"}</p></section>
        <section className="consistency-card"><h2><Lightbulb /> Lore consistency check</h2><strong>{Math.max(2, state.contradictions.length)} claims at risk</strong>{state.contradictions.length ? <ul>{state.contradictions.map((item) => <li key={item}>{item}</li>)}</ul> : <ul><li>Raymond’s location and possession of the file overlap.</li><li>The delay timeline is increasingly difficult to verify.</li></ul>}</section>
        <section className="interrogation-log"><h2>Interrogation log</h2>{interrogation.transcript.map((item, index) => <div key={item.id}><span>{item.speaker === "interrogator" ? `Q${Math.ceil((index + 1) / 2)}` : `A${Math.ceil((index + 1) / 2)}`}</span><p>{item.text}</p></div>)}</section>
      </aside>
      <Recommendation state={state} />
    </main>
  );
}

function HistoryDrawer({ cases, onClose, onOpen, onClear }: { cases: CaseSummary[]; onClose: () => void; onOpen: (id: string) => void; onClear: () => void }) {
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="history-drawer" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <header><div><span className="eyebrow">Browser-linked archive</span><h2 id="history-title">Case history</h2></div><button className="icon-button" onClick={onClose} aria-label="Close history"><X /></button></header>
        <div className="history-list">{cases.length ? cases.map((item) => <button key={item.id} onClick={() => { onOpen(item.id); onClose(); }}><BookOpen /><span><strong>CASE #{String(item.caseNumber).padStart(3, "0")}</strong><small>{item.title}</small><small>Chaos {item.chaosLevel} · {item.status}</small></span><ChevronRight /></button>) : <p>No cases yet. Start with a harmless situation.</p>}</div>
        {cases.length > 0 && <button className="clear-history" onClick={onClear}><Trash2 /> Clear case history</button>}
      </aside>
    </div>
  );
}

export function MaximumExtraApp() {
  const [state, setState] = useState<ExcuseState | null>(null);
  const [recentCases, setRecentCases] = useState<CaseSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const refreshCases = useCallback(async () => {
    const response = await fetch("/api/cases", { cache: "no-store" });
    if (response.ok) setRecentCases((await response.json()).cases);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/cases", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (active && payload) setRecentCases(payload.cases); });
    return () => { active = false; };
  }, []);

  async function createCase(input: { scenario: string; audience: Audience; userRole: UserRole; genre: Genre; startingChaos: number }) {
    setBusy(true);
    setNotice("Generating a harmless excuse…");
    try {
      const response = await fetch("/api/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not create the case.");
      setState(payload.state);
      setNotice(payload.notice);
      await refreshCases();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create the case.");
    } finally { setBusy(false); }
  }

  async function openCase(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/cases/${id}`, { cache: "no-store" });
      if (!response.ok) throw new Error("That case could not be opened.");
      setState((await response.json()).state);
      setNotice("Case restored.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not open the case."); }
    finally { setBusy(false); }
  }

  async function act(action: CaseAction) {
    if (!state || busy) return;
    setBusy(true);
    setNotice(action.type === "answer_interrogation" ? "Checking your timeline…" : "Consulting Raymond…");
    try {
      const response = await fetch(`/api/cases/${state.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, expectedVersion: state.version, idempotencyKey: crypto.randomUUID() }),
      });
      const payload = await response.json();
      if (response.status === 409 && payload.state) {
        setState(payload.state);
        throw new Error("This case changed in another tab. The latest version is now loaded.");
      }
      if (!response.ok) throw new Error(payload.message ?? "The action could not be completed.");
      const result = payload as ActionResult;
      setState(result.state);
      setNotice(result.notice ?? "Case updated.");
      await refreshCases();
    } catch (error) { setNotice(error instanceof Error ? error.message : "The action could not be completed."); }
    finally { setBusy(false); }
  }

  async function clearHistory() {
    await fetch("/api/cases", { method: "DELETE" });
    setState(null);
    setHistoryOpen(false);
    setNotice("Case history cleared.");
    await refreshCases();
  }

  const isInterrogating = Boolean(state?.interrogation?.active);
  return (
    <ThemeShell state={state} liveMessage={notice} onNewCase={() => { setState(null); setNotice("New case ready."); }} onHistory={() => setHistoryOpen(true)}>
      {!state ? <CreationView recentCases={recentCases} onCreate={createCase} onOpen={openCase} busy={busy} /> : isInterrogating ? <InterrogationView state={state} busy={busy} onAction={act} /> : <WorkspaceView state={state} busy={busy} onAction={act} />}
      {notice && <div className={`toast ${notice.toLowerCase().includes("fallback") ? "fallback-toast" : ""}`}><Sparkles /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notification"><X /></button></div>}
      {historyOpen && <HistoryDrawer cases={recentCases} onClose={() => setHistoryOpen(false)} onOpen={openCase} onClear={clearHistory} />}
    </ThemeShell>
  );
}
