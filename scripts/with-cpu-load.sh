#!/usr/bin/env bash
set -euo pipefail

workers=4
duration=30
pid_file=""
worker_pids=()
command_pid=""

usage() {
  cat >&2 <<'EOF'
Usage: npm run test:under-load -- [--workers N] [--duration SECONDS] [--pid-file PATH] -- COMMAND [ARGS...]

Runs COMMAND while N bounded CPU workers are active. Workers are always stopped
when the command exits or the harness receives EXIT, INT, TERM, or HUP.
EOF
}

fail() {
  printf 'with-cpu-load: %s\n' "$1" >&2
  usage
  exit 2
}

cleanup() {
  local pid
  trap - EXIT INT TERM HUP
  set +u
  if [[ -n "$command_pid" ]]; then
    kill "$command_pid" 2>/dev/null || true
    wait "$command_pid" 2>/dev/null || true
  fi
  for pid in "${worker_pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  for pid in "${worker_pids[@]}"; do
    wait "$pid" 2>/dev/null || true
  done
}

on_signal() {
  local exit_code="$1"
  cleanup
  exit "$exit_code"
}

trap cleanup EXIT
trap 'on_signal 130' INT
trap 'on_signal 143' TERM
trap 'on_signal 129' HUP

while (($# > 0)); do
  case "$1" in
    --workers)
      (($# >= 2)) || fail '--workers requires a value'
      workers="$2"
      shift 2
      ;;
    --duration)
      (($# >= 2)) || fail '--duration requires a value'
      duration="$2"
      shift 2
      ;;
    --pid-file)
      (($# >= 2)) || fail '--pid-file requires a value'
      pid_file="$2"
      shift 2
      ;;
    --)
      shift
      break
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "unknown option: $1"
      ;;
  esac
done

[[ "$workers" =~ ^[0-9]+$ ]] || fail 'workers must be an integer'
((workers >= 1 && workers <= 12)) ||
  fail 'workers must be between 1 and 12'
[[ "$duration" =~ ^[0-9]+$ ]] || fail 'duration must be an integer'
((duration >= 1 && duration <= 300)) ||
  fail 'duration must be between 1 and 300 seconds'
(($# > 0)) || fail 'a command is required after --'

node_binary="${LOAD_HARNESS_NODE:-$(command -v node || true)}"
[[ -n "$node_binary" ]] || fail 'node is required to generate bounded load'
script_dir="${LOAD_HARNESS_SCRIPT_DIR:-$(cd "$(dirname "$0")" && pwd)}"

for ((index = 0; index < workers; index += 1)); do
  "$node_binary" -e '
    const end = Date.now() + Number(process.argv[1]) * 1000;
    let value = 1;
    while (Date.now() < end) {
      value = Math.imul(value ^ 0x9e3779b9, 2654435761);
    }
    process.exit(value === Number.MIN_SAFE_INTEGER ? 1 : 0);
  ' "$duration" &
  worker_pids+=("$!")
done

if [[ -n "$pid_file" ]]; then
  printf '%s\n' "${worker_pids[@]}" > "$pid_file"
fi

printf 'with-cpu-load: running %q with %d workers for at most %ds\n' \
  "$1" "$workers" "$duration" >&2
"$node_binary" "$script_dir/run-command-group.mjs" "$@" &
command_pid="$!"
set +e
wait "$command_pid"
status="$?"
set -e
command_pid=""
exit "$status"
