# MANGO Recruiter Scorecard

This scorecard is the release gate for StreamSense. Every category must score at
least 4/5, the total must reach 26/30, and no critical finding may remain.

## Current assessment

| Category | Score | Evidence | Recruiter critique |
|---|---:|---|---|
| Correctness and functionality | 4.5/5 | API and aggregation contracts are tested; the hosted dashboard has deterministic data; Docker smoke test exercises the complete path in CI. | Strong end-to-end story. Production-scale percentile aggregation would need a bounded algorithm. |
| Architecture and data contracts | 4.5/5 | Simulator → Kafka → worker → PostgreSQL → API boundaries are explicit; minute/service grain is enforced by a primary key. | Components have clear ownership and failure boundaries. A schema registry would be the next mature step. |
| Code quality and security | 4.5/5 | Input validation, rate limiting, Helmet, fail-closed CORS, environment-based secrets, locked dependencies, and zero dependency audit findings. | Sensible defaults and readable modules. Structured logging would improve production operations. |
| Testing and reproducibility | 4.5/5 | 18 automated tests, lint, production build, deterministic showcase data, locked installs, and a green CI Compose smoke test. | Good release discipline. A sustained-load test would add confidence beyond smoke coverage. |
| UI, accessibility, and product judgment | 4.5/5 | Responsive editorial interface, keyboard focus, reduced motion, semantic table, error/empty/loading states, and explicit data provenance. | The product feels intentional and honest. A future release could add saved views without cluttering the core. |
| Documentation and deployment readiness | 4.5/5 | Verified live URL, architecture, contracts, commands, limitations, deployment model, and successful CI evidence are documented. | Clear enough for a recruiter to run and evaluate. Full hosted streaming infrastructure is deliberately out of scope. |
| **Total** | **27.0/30** | **All category floors pass; no critical or high-severity findings remain.** | **Release accepted.** |

## Coherent-change reviews

### 1. Hosted product correction

- **Finding:** The prior Vercel build called an API that was not deployed and
  described the resulting page as a live demo.
- **Change:** Added deterministic, minute-contiguous showcase telemetry and a
  prominent provenance banner. Docker builds explicitly retain live API mode.
- **Judgment:** Critical release blocker resolved. The portfolio site now works
  for every visitor and makes no unsupported infrastructure claim.

### 2. Design and accessibility pass

- **Finding:** The interface was coherent but visually generic and lacked strong
  focus treatment and a mobile provenance layout.
- **Change:** Refined the warm editorial palette, serif display hierarchy,
  spacing, responsive behavior, touch targets, focus indicators, and motion.
- **Judgment:** MANGO-worthy visual restraint: stylish without compromising scan speed.

### 3. Dependency and release hardening

- **Finding:** Express 4 pulled a vulnerable query-string parser and CI tested
  modules without proving the Docker path.
- **Change:** Upgraded to Express 5, reached zero production audit findings, and
  added a clean Compose smoke test from event publication through the API.
- **Judgment:** Security and reproducibility meet the hiring bar; CI and deployed
  release evidence remain the final acceptance check.

## Final acceptance checklist

- [x] Every README capability has code or test evidence.
- [x] Hosted interface works without private infrastructure.
- [x] Full live pipeline remains runnable through Docker Compose.
- [x] Automated unit, component, lint, and build gates pass locally.
- [x] Dependency audits report no known vulnerabilities.
- [x] GitHub Actions verifies the complete Docker pipeline.
- [x] Production Vercel URL is deployed and checked.
- [x] Repository and project tracker are clean and current.
