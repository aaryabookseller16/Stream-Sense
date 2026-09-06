#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  docker compose down --volumes --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT
cleanup
docker compose up --build --detach

for attempt in $(seq 1 60); do
  if curl --fail --silent http://127.0.0.1:8001/health >/dev/null \
    && curl --fail --silent http://127.0.0.1:3001/ >/dev/null \
    && curl --fail --silent http://127.0.0.1:3001/dashboard >/dev/null; then
    break
  fi

  if [ "$attempt" -eq 60 ]; then
    docker compose ps
    docker compose logs --no-color --tail=120
    echo "StreamSense services did not become healthy in time." >&2
    exit 1
  fi

  sleep 2
done

for attempt in $(seq 1 45); do
  if node --input-type=module -e '
    const response = await fetch("http://127.0.0.1:8001/kpis?minutes=5");
    if (!response.ok) process.exit(1);
    const metrics = await response.json();
    if (metrics.summary.total_events < 1 || metrics.services.length < 1) process.exit(1);
  '; then
    echo "Compose smoke test passed: the pipeline produced queryable telemetry."
    exit 0
  fi

  if [ "$attempt" -eq 45 ]; then
    docker compose ps
    docker compose logs --no-color --tail=120
    echo "The pipeline started but did not produce telemetry in time." >&2
    exit 1
  fi

  sleep 2
done
