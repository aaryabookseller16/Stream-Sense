import "./LandingPage.css";

const pipeline = [
  { name: "Services", detail: "Emit events" },
  { name: "Kafka", detail: "Streams traffic" },
  { name: "Worker", detail: "Builds windows" },
  { name: "Postgres", detail: "Stores signals" },
  { name: "Dashboard", detail: "Explains health" },
];

const features = [
  {
    number: "01",
    title: "See the system, not a sea of logs.",
    copy: "StreamSense turns raw request events into a live view of throughput, failures, and latency—organized by the services your team owns.",
  },
  {
    number: "02",
    title: "Catch the shape of change.",
    copy: "Minute-level windows make spikes and regressions obvious while 15, 30, and 60-minute views keep the right amount of context in reach.",
  },
  {
    number: "03",
    title: "Follow the signal to its source.",
    copy: "Per-service health states show where errors or latency cross operational thresholds, so teams know where to investigate first.",
  },
];

function ProductLink({ children, className, onNavigate }) {
  return (
    <a
      className={className}
      href="/dashboard"
      onClick={(event) => {
        event.preventDefault();
        onNavigate("/dashboard");
      }}
    >
      {children}
    </a>
  );
}

function Brand() {
  return (
    <a className="landing-brand" href="/" aria-label="StreamSense home">
      <span className="landing-brand__mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        <strong>StreamSense</strong>
        <small>Realtime service intelligence</small>
      </span>
    </a>
  );
}

function PipelineVisual() {
  return (
    <ol className="pipeline-visual" aria-label="Event pipeline">
      {pipeline.map((node, index) => (
        <li key={node.name}>
          <span className="pipeline-visual__index">{index + 1}</span>
          <div>
            <strong>{node.name}</strong>
            <small>{node.detail}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}

function DashboardPreview() {
  const stats = [
    { label: "Total requests", value: "8,492" },
    { label: "Traffic rate", value: "141.5 / min" },
    { label: "Avg latency", value: "184.2 ms" },
    { label: "Error rate", value: "1.84%" },
  ];

  return (
    <div className="product-preview" aria-label="Preview of the StreamSense dashboard">
      <div className="product-preview__topbar">
        <span>StreamSense</span>
        <span className="preview-live">
          <i aria-hidden="true" />
          Operational
        </span>
      </div>
      <div className="product-preview__stats">
        {stats.map((stat) => (
          <article key={stat.label}>
            <small>{stat.label}</small>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}

function LandingPage({ onNavigate }) {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Brand />
        <nav aria-label="Product navigation">
          <a href="#why">Why StreamSense</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <ProductLink className="nav-cta" onNavigate={onNavigate}>
          Open dashboard
          <span aria-hidden="true">↗</span>
        </ProductLink>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <p className="eyebrow">Event-streaming observability</p>
            <h1>Every service leaves a signal. Make it legible.</h1>
            <p className="landing-hero__lede">
              StreamSense transforms high-volume request events into a focused,
              real-time picture of traffic, latency, and service health.
            </p>
            <div className="landing-hero__actions">
              <ProductLink className="button button-primary" onNavigate={onNavigate}>
                Explore the dashboard
                <span aria-hidden="true">→</span>
              </ProductLink>
              <a className="button" href="#how-it-works">
                See how it works
              </a>
            </div>
            <div className="landing-hero__proof" aria-label="Product facts">
              <span>
                <strong>4 sec</strong> refresh cadence
              </span>
              <span>
                <strong>120 min</strong> query range
              </span>
              <span>
                <strong>5</strong> demo services
              </span>
            </div>
          </div>
          <div className="landing-hero__visual">
            <PipelineVisual />
          </div>
        </section>

        <section className="proof-strip" aria-label="StreamSense technology">
          <p className="text-muted text-sm">Built on a production-style streaming path</p>
          <div>
            <span>Redpanda</span>
            <span>Node.js</span>
            <span>PostgreSQL</span>
            <span>React</span>
          </div>
        </section>

        <section className="landing-section" id="why">
          <div className="section-heading">
            <p className="eyebrow">Why StreamSense</p>
            <h2>Operational clarity without the ceremony.</h2>
            <p className="text-muted">
              The important signals stay in the foreground, while the streaming
              system handles aggregation and persistence behind the scenes.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="card feature-card" key={feature.number}>
                <span className="text-muted text-sm">{feature.number}</span>
                <h3>{feature.title}</h3>
                <p className="text-muted">{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section product-section">
          <div className="product-section__copy">
            <p className="eyebrow">The operational control plane</p>
            <h2>One view from pulse to problem.</h2>
            <p className="text-muted">
              Scan system health, read the traffic pattern, and compare every
              service without switching tools or rebuilding queries.
            </p>
            <ul>
              <li>Automatic traffic and error visualization</li>
              <li>Per-service health thresholds</li>
              <li>Average and p95 latency signals</li>
              <li>Windowed operational context</li>
            </ul>
            <ProductLink className="button button-primary" onNavigate={onNavigate}>
              Enter the dashboard <span aria-hidden="true">↗</span>
            </ProductLink>
          </div>
          <DashboardPreview />
        </section>

        <section className="landing-section" id="how-it-works">
          <div className="section-heading">
            <p className="eyebrow">How it works</p>
            <h2>A complete signal path in five steps.</h2>
            <p className="text-muted">
              Each part does one job well, creating a system that is easy to
              understand, operate, and extend.
            </p>
          </div>
          <div className="steps">
            {pipeline.map((step, index) => (
              <article className="card step-card" key={step.name}>
                <span className="text-muted text-sm">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{step.name}</h3>
                <p className="text-muted">
                  {
                    [
                      "Applications emit normalized request events with service, status, latency, and timestamp.",
                      "Redpanda transports those events through a durable Kafka-compatible topic.",
                      "The worker validates traffic and calculates minute-level service windows.",
                      "PostgreSQL upserts stable KPI snapshots for reliable, efficient reads.",
                      "The API shapes those signals into a dashboard that refreshes automatically.",
                    ][index]
                  }
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <p className="eyebrow">See the stream for yourself</p>
          <h2>Move from raw events to a readable system.</h2>
          <p className="text-muted">
            Explore a reproducible browser showcase, then run the repository locally for the
            complete live Kafka pipeline.
          </p>
          <ProductLink className="button button-primary" onNavigate={onNavigate}>
            Open the dashboard showcase
            <span aria-hidden="true">→</span>
          </ProductLink>
        </section>
      </main>

      <footer className="landing-footer">
        <Brand />
        <p className="text-muted text-sm">Kafka → Worker → PostgreSQL → API → Interface</p>
        <ProductLink className="text-sm" onNavigate={onNavigate}>
          Dashboard ↗
        </ProductLink>
      </footer>
    </div>
  );
}

export default LandingPage;
