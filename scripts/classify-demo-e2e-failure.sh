#!/usr/bin/env bash
set -euo pipefail

failure_class="workflow setup or PostgreSQL service startup"

if [[ "${DATABASE_SERVICE_DRILL_OUTCOME:-}" == "failure" || "${DATABASE_SERVICE_HEALTH_OUTCOME:-}" == "failure" ]]; then
  failure_class="PostgreSQL service startup"
elif [[ "${DATABASE_SCHEMA_OUTCOME:-}" == "failure" ]]; then
  failure_class="database schema application"
elif [[ "${API_STARTUP_DRILL_OUTCOME:-}" == "failure" || "${API_STARTUP_OUTCOME:-}" == "failure" ]]; then
  failure_class="API startup/import"
elif [[ "${JOURNEY_TEST_OUTCOME:-}" == "failure" ]]; then
  failure_class="seeded API journey test"
fi

printf '%s\n' "$failure_class"