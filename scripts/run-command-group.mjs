/**
 * Run a command in its own POSIX process group. Forward termination signals
 * to the whole group, then force-stop the group after a bounded grace period.
 */
import { spawn } from 'node:child_process';

const command = process.argv.slice(2);
if (command.length === 0) {
  console.error('run-command-group: command required');
  process.exit(2);
}

const child = spawn(command[0], command.slice(1), {
  detached: true,
  stdio: 'inherit',
});
let terminating = false;

function signalGroup(signal) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error;
  }
}

for (const [signal, exitCode] of [
  ['SIGINT', 130],
  ['SIGTERM', 143],
  ['SIGHUP', 129],
]) {
  process.on(signal, () => {
    if (terminating) return;
    terminating = true;
    signalGroup(signal);
    const forceTimer = setTimeout(() => signalGroup('SIGKILL'), 1_000);
    forceTimer.unref();
    child.once('exit', () => process.exit(exitCode));
  });
}

child.once('error', (error) => {
  console.error(`run-command-group: ${error.message}`);
  process.exit(127);
});

child.once('exit', (code, signal) => {
  if (terminating) return;
  if (signal) {
    const signalExitCodes = { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 };
    process.exit(signalExitCodes[signal] ?? 1);
  }
  process.exit(code ?? 1);
});
