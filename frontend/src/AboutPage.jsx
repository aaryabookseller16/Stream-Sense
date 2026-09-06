import "./AboutPage.css";
import { Brand, PageLink, SiteHeader } from "./components/SiteHeader.jsx";

const decisions = [
  {
    number: "01",
    title: "Stable minute-level grain",
    copy: "Every service owns one row per UTC minute. Idempotent PostgreSQL upserts make retries safe and the data model easy to explain.",
  },
  {
    number: "02",
    title: "Truthful public showcase",
    copy: "Vercel uses deterministic telemetry, so the interface is always reviewable without disguising sample data as a live production system.",
  },
  {
    number: "03",
    title: "Failure is a product state",
    copy: "Invalid events are rejected, stale services become offline, and loading, empty, and disconnected states remain understandable.",
  },
];

const architecture = [
  ["Generate", "A weighted simulator emits realistic service events."],
  ["Transport", "Redpanda carries events through a Kafka-compatible topic."],
  ["Aggregate", "A Node worker validates and composes minute windows."],
  ["Persist", "PostgreSQL stores stable service KPI snapshots."],
  ["Explain", "Express and React turn system state into decisions."],
];

function AboutPage({ onNavigate }) {
  return (
    <div className="landing-page about-page">
      <SiteHeader currentPath="/" onNavigate={onNavigate} />

      <main>
        <section className="about-hero">
          <div>
            <p className="eyebrow">About StreamSense</p>
            <h1>Operational data should feel <em>obvious.</em></h1>
          </div>
          <div className="about-hero__copy">
            <p>
              StreamSense is an end-to-end streaming systems project built to answer
              one practical question: can a team understand what its services are
              doing without reading a wall of logs?
            </p>
            <p className="text-muted">
              It pairs a production-style data path with a deliberately calm interface—
              engineering depth behind the scenes, clarity at the point of use.
            </p>
          </div>
        </section>

        <section className="about-facts" aria-label="Project facts">
          <span><strong>6</strong><small>running services</small></span>
          <span><strong>20</strong><small>automated checks</small></span>
          <span><strong>27/30</strong><small>recruiter score</small></span>
          <span><strong>0</strong><small>known vulnerabilities</small></span>
        </section>

        <section className="about-principles" id="principles">
          <div className="about-principles__intro">
            <p className="eyebrow">Design principles</p>
            <h2>Complex underneath.<br />Quiet on purpose.</h2>
          </div>
          <div className="principle-stack">
            {decisions.map((decision) => (
              <article key={decision.number}>
                <span>{decision.number}</span>
                <div>
                  <h3>{decision.title}</h3>
                  <p>{decision.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about-architecture" id="architecture">
          <div className="section-heading">
            <p className="eyebrow">Architecture</p>
            <h2>One event. Five deliberate handoffs.</h2>
            <p>
              Each boundary has a single responsibility, a visible contract, and a
              failure mode the rest of the system can survive.
            </p>
          </div>
          <ol className="architecture-track">
            {architecture.map(([title, copy], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-cta">
          <div>
            <p className="eyebrow">See the system thinking</p>
            <h2>From stream to signal,<br />in one focused view.</h2>
          </div>
          <PageLink className="button button-primary" href="/dashboard" onNavigate={onNavigate}>
            Explore the dashboard <span aria-hidden="true">→</span>
          </PageLink>
        </section>
      </main>

      <footer className="landing-footer">
        <Brand onNavigate={onNavigate} />
        <p className="text-muted text-sm">Built for clarity, tested as a system.</p>
        <PageLink className="text-sm" href="/product" onNavigate={onNavigate}>Product overview ↗</PageLink>
      </footer>
    </div>
  );
}

export default AboutPage;
