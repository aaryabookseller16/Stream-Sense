import "./LandingPage.css";

const pipeline = [
  { name: "Services", detail: "Emit events", code: "01" },
  { name: "Kafka", detail: "Streams traffic", code: "02" },
  { name: "Worker", detail: "Builds windows", code: "03" },
  { name: "Postgres", detail: "Stores signals", code: "04" },
  { name: "Dashboard", detail: "Explains health", code: "05" },
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
    <div
      className="pipeline-visual"
      aria-label="Events flow from services through Kafka and a metrics worker into PostgreSQL and the live dashboard"
    >
      <div className="pipeline-visual__grid" aria-hidden="true" />
      <div className="pipeline-visual__status">
        <span><i />Live event stream</span>
        <strong>2.8 events / sec</strong>
      </div>
      <div className="pipeline-visual__flow">
        <span className="flow-line" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        {pipeline.map((node, index) => (
          <article
            className={`flow-node flow-node--${index + 1}`}
            key={node.name}
            style={{ "--node-delay": `${index * 90}ms` }}
          >
            <span className="flow-node__code">{node.code}</span>
            <div className="flow-node__signal" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <strong>{node.name}</strong>
            <small>{node.detail}</small>
          </article>
        ))}
      </div>
      <div className="pipeline-visual__ticker" aria-hidden="true">
        <span>checkout.request.completed</span>
        <span>payments · 218ms · 200</span>
        <span>catalog · 91ms · 200</span>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="product-preview" aria-label="Preview of the StreamSense dashboard">
      <div className="product-preview__topbar">
        <span><i />StreamSense</span>
        <span className="preview-live"><i />Operational</span>
      </div>
      <div className="product-preview__intro">
        <div>
          <small>Operations overview</small>
          <strong>Live service health</strong>
        </div>
        <span>15m <i>30m</i> 60m</span>
      </div>
      <div className="product-preview__stats">
        <article>
          <small>Total requests</small>
          <strong>8,492</strong>
          <span>+12.4%</span>
        </article>
        <article>
          <small>Traffic rate</small>
          <strong>141.5</strong>
          <span>requests / min</span>
        </article>
        <article>
          <small>Avg latency</small>
          <strong>184.2</strong>
          <span>milliseconds</span>
        </article>
        <article>
          <small>Error rate</small>
          <strong>1.84%</strong>
          <span>within target</span>
        </article>
      </div>
      <div className="product-preview__body">
        <div className="preview-chart">
          <div className="preview-chart__heading">
            <span>Request throughput</span>
            <small>Requests <i /> Errors <i /></small>
          </div>
          <div className="preview-chart__bars" aria-hidden="true">
            {[42, 56, 47, 72, 65, 82, 58, 88, 76, 93, 68, 84].map(
              (height, index) => (
                <i key={index} style={{ "--bar-size": `${height}%` }}>
                  {index === 8 && <span />}
                </i>
              )
            )}
          </div>
        </div>
        <div className="preview-services">
          <span>Service health <strong>5</strong></span>
          {["checkout", "catalog", "payments", "identity"].map((service, index) => (
            <i key={service}>
              <span><b />{service}</span>
              <small>{[214, 96, 346, 148][index]} ms</small>
            </i>
          ))}
        </div>
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
          <a href="#architecture">Architecture</a>
        </nav>
        <ProductLink className="nav-cta" onNavigate={onNavigate}>
          Open dashboard
          <span aria-hidden="true">↗</span>
        </ProductLink>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <p className="landing-kicker">
              <span aria-hidden="true" />
              Event-streaming observability
            </p>
            <h1>
              Every service tells a story.
              <span> Read it live.</span>
            </h1>
            <p className="landing-hero__lede">
              StreamSense transforms high-volume request events into a focused,
              real-time picture of traffic, latency, and service health.
            </p>
            <div className="landing-hero__actions">
              <ProductLink className="primary-cta" onNavigate={onNavigate}>
                Explore the live dashboard
                <span aria-hidden="true">→</span>
              </ProductLink>
              <a className="secondary-cta" href="#how-it-works">
                See how it works
                <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="landing-hero__proof" aria-label="Product facts">
              <span><strong>4 sec</strong> live refresh</span>
              <span><strong>120 min</strong> query range</span>
              <span><strong>5</strong> demo services</span>
            </div>
          </div>
          <div className="landing-hero__visual">
            <PipelineVisual />
          </div>
        </section>

        <section className="proof-strip" aria-label="StreamSense technology">
          <p>Built on a production-style streaming path</p>
          <div>
            <span>Redpanda</span>
            <i />
            <span>Node.js</span>
            <i />
            <span>PostgreSQL</span>
            <i />
            <span>React</span>
          </div>
        </section>

        <section className="landing-section why-section" id="why">
          <div className="section-heading">
            <p className="landing-kicker">Why StreamSense</p>
            <h2>Operational clarity without the ceremony.</h2>
            <p>
              The important signals stay in the foreground, while the streaming
              system handles aggregation and persistence behind the scenes.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.number}>
                <span>{feature.number}</span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section product-section">
          <div className="product-section__copy">
            <p className="landing-kicker">The live control plane</p>
            <h2>One view from pulse to problem.</h2>
            <p>
              Scan system health, read the traffic pattern, and compare every
              service without switching tools or rebuilding queries.
            </p>
            <ul>
              <li><span>01</span>Automatic traffic and error visualization</li>
              <li><span>02</span>Per-service health thresholds</li>
              <li><span>03</span>Average and p95 latency signals</li>
              <li><span>04</span>Windowed operational context</li>
            </ul>
            <ProductLink className="text-link" onNavigate={onNavigate}>
              Enter the dashboard <span aria-hidden="true">↗</span>
            </ProductLink>
          </div>
          <DashboardPreview />
        </section>

        <section className="landing-section how-section" id="how-it-works">
          <div className="section-heading section-heading--row">
            <div>
              <p className="landing-kicker">How it works</p>
              <h2>A complete signal path in five steps.</h2>
            </div>
            <p>
              Each part does one job well, creating a system that is easy to
              understand, operate, and extend.
            </p>
          </div>
          <div className="steps">
            {pipeline.map((step, index) => (
              <article className="step-card" key={step.name}>
                <span>{step.code}</span>
                <div className="step-card__icon" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <h3>{step.name}</h3>
                <p>
                  {[
                    "Applications emit normalized request events with service, status, latency, and timestamp.",
                    "Redpanda transports those events through a durable Kafka-compatible topic.",
                    "The worker validates traffic and calculates minute-level service windows.",
                    "PostgreSQL upserts stable KPI snapshots for reliable, efficient reads.",
                    "The API shapes those signals into a dashboard that refreshes automatically.",
                  ][index]}
                </p>
                {index < pipeline.length - 1 && (
                  <strong className="step-card__connector" aria-hidden="true">→</strong>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="architecture-section" id="architecture">
          <div className="architecture-section__copy">
            <p className="landing-kicker">Architecture</p>
            <h2>Small services. Clear contracts. Live results.</h2>
            <p>
              StreamSense is intentionally compact: each service owns a focused
              boundary, and every handoff is explicit.
            </p>
          </div>
          <div className="architecture-stack" aria-label="StreamSense service architecture">
            {["Simulator", "Kafka", "Worker", "PostgreSQL", "Express API", "React UI"].map(
              (item, index) => (
                <span key={item}>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  <strong>{item}</strong>
                  {index < 5 && <i aria-hidden="true">→</i>}
                </span>
              )
            )}
          </div>
        </section>

        <section className="landing-cta">
          <div className="landing-cta__orb" aria-hidden="true" />
          <p className="landing-kicker">See the stream for yourself</p>
          <h2>Move from raw events to a readable system.</h2>
          <p>The demo is already running and producing live service traffic.</p>
          <ProductLink className="primary-cta primary-cta--light" onNavigate={onNavigate}>
            Open the live dashboard
            <span aria-hidden="true">→</span>
          </ProductLink>
        </section>
      </main>

      <footer className="landing-footer">
        <Brand />
        <p>Kafka → Worker → PostgreSQL → API → Interface</p>
        <ProductLink className="footer-link" onNavigate={onNavigate}>
          Dashboard ↗
        </ProductLink>
      </footer>
    </div>
  );
}

export default LandingPage;
