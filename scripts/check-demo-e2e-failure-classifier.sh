#!/usr/bin/env bash
set -euo pipefail

workflow_file=".github/workflows/demo-e2e.yml"
classifier="./scripts/classify-demo-e2e-failure.sh"

fail() {
  echo "demo-e2e failure classifier check: $*" >&2
  exit 1
}

assert_workflow_contains() {
  local expected="$1"
  grep -Fq -- "$expected" "$workflow_file" ||
    fail "workflow is missing: $expected"
}

[[ -f "$workflow_file" ]] || fail "workflow file does not exist: $workflow_file"
[[ -f "$classifier" ]] || fail "classifier file does not exist: $classifier"

# Keep the synthetic outcome names tied to the step IDs and outcome wiring in
# the workflow. If a phase is renamed, this check should fail before the
# classifier can silently become stale.
declare -a phase_ids=(
  database-service-drill
  database-service-health
  database-schema
  api-startup-drill
  api-startup
  journey-test
)
declare -a phase_env_names=(
  DATABASE_SERVICE_DRILL_OUTCOME
  DATABASE_SERVICE_HEALTH_OUTCOME
  DATABASE_SCHEMA_OUTCOME
  API_STARTUP_DRILL_OUTCOME
  API_STARTUP_OUTCOME
  JOURNEY_TEST_OUTCOME
)

for phase_id in "${phase_ids[@]}"; do
  assert_workflow_contains "id: $phase_id"
done

for index in "${!phase_ids[@]}"; do
  assert_workflow_contains "${phase_env_names[$index]}: \${{ steps.${phase_ids[$index]}.outcome }}"
done

declare -A drill_indexes=(
  [database-service]=0
  [schema]=2
  [api-startup]=3
  [journey]=5
)
declare -A expected_classes=(
  [database-service]="PostgreSQL service startup"
  [schema]="database schema application"
  [api-startup]="API startup/import"
  [journey]="seeded API journey test"
)

for drill in database-service schema api-startup journey; do
  failed_index="${drill_indexes[$drill]}"
  expected_class="${expected_classes[$drill]}"
  declare -a outcomes=()

  for index in "${!phase_env_names[@]}"; do
    if (( index < failed_index )); then
      outcome="success"
    elif (( index == failed_index )); then
      outcome="failure"
    else
      outcome="skipped"
    fi
    outcomes+=("${phase_env_names[$index]}=$outcome")
  done

  actual_class="$(env -i PATH="$PATH" "${outcomes[@]}" bash "$classifier")"
  [[ "$actual_class" == "$expected_class" ]] ||
    fail "$drill drill classified as '$actual_class', expected '$expected_class'"
done

api_startup_class="$(env -i PATH="$PATH" \
  DATABASE_SERVICE_DRILL_OUTCOME=success \
  DATABASE_SERVICE_HEALTH_OUTCOME=success \
  DATABASE_SCHEMA_OUTCOME=success \
  API_STARTUP_DRILL_OUTCOME=success \
  API_STARTUP_OUTCOME=failure \
  JOURNEY_TEST_OUTCOME=skipped \
  bash "$classifier")"
journey_class="$(env -i PATH="$PATH" \
  DATABASE_SERVICE_DRILL_OUTCOME=success \
  DATABASE_SERVICE_HEALTH_OUTCOME=success \
  DATABASE_SCHEMA_OUTCOME=success \
  API_STARTUP_DRILL_OUTCOME=skipped \
  API_STARTUP_OUTCOME=success \
  JOURNEY_TEST_OUTCOME=failure \
  bash "$classifier")"

[[ "$api_startup_class" == "API startup/import" ]] ||
  fail "API startup/import failure lost its classification"
[[ "$journey_class" == "seeded API journey test" ]] ||
  fail "seeded journey failure lost its classification"
[[ "$api_startup_class" != "$journey_class" ]] ||
  fail "API startup/import and seeded journey classifications are not distinct"

echo "demo-e2e failure classifier check passed"