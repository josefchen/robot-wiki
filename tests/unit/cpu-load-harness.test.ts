import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const HARNESS = join(ROOT, 'scripts/with-cpu-load.sh');

async function waitForFile(path: string): Promise<string> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      return await readFile(path, 'utf8');
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw new Error(`Timed out waiting for ${path}`);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function runHarness(script: string, pidFile: string) {
  return spawn(
    '/bin/bash',
    [
      script,
      '--workers',
      '2',
      '--duration',
      '2',
      '--pid-file',
      pidFile,
      '--',
      '/usr/bin/true',
    ],
    {
      cwd: ROOT,
      stdio: 'pipe',
      env: {
        ...process.env,
        LOAD_HARNESS_SCRIPT_DIR: join(ROOT, 'scripts'),
      },
    },
  );
}

async function waitForExit(child: ReturnType<typeof spawn>): Promise<number | null> {
  if (child.exitCode !== null) {
    return child.exitCode;
  }
  return await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code));
  });
}

describe('with-cpu-load.sh', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cpu-load-harness-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('starts the requested workers and cleans every worker on normal exit', async () => {
    const pidFile = join(tempDir, 'workers.pid');
    const child = runHarness(HARNESS, pidFile);
    const pids = (await waitForFile(pidFile))
      .trim()
      .split('\n')
      .map(Number);

    expect(pids).toHaveLength(2);
    expect(await waitForExit(child)).toBe(0);
    expect(pids.every((pid) => !isAlive(pid))).toBe(true);
  });

  it('rejects unbounded or excessive load settings before starting workers', async () => {
    const child = spawn(
      '/bin/bash',
      [HARNESS, '--workers', '1', '--duration', '0', '--', '/usr/bin/true'],
      { cwd: ROOT, stdio: 'pipe' },
    );
    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });

    expect(await waitForExit(child)).toBe(2);
    expect(stderr).toContain('duration must be between 1 and 300 seconds');
  });

  it('stops the wrapped command and all workers when the harness is terminated', async () => {
    const pidFile = join(tempDir, 'signal-workers.pid');
    const commandPidFile = join(tempDir, 'wrapped-command.pid');
    const descendantPidFile = join(tempDir, 'wrapped-descendant.pid');
    const child = spawn(
      '/bin/bash',
      [
        HARNESS,
        '--workers',
        '2',
        '--duration',
        '20',
        '--pid-file',
        pidFile,
        '--',
        process.execPath,
        '-e',
        `
          const { spawn } = require('node:child_process');
          const fs = require('node:fs');
          fs.writeFileSync(${JSON.stringify(commandPidFile)}, String(process.pid));
          process.on('SIGTERM', () => {});
          const descendant = spawn(process.execPath, ['-e', ${JSON.stringify(`
            require('node:fs').writeFileSync(${JSON.stringify(descendantPidFile)}, String(process.pid));
            process.on('SIGTERM', () => {});
            setTimeout(() => {}, 20_000);
          `)}], { stdio: 'ignore' });
          descendant.unref();
          setTimeout(() => {}, 20_000);
        `,
      ],
      { cwd: ROOT, stdio: 'pipe' },
    );
    const workerPids = (await waitForFile(pidFile))
      .trim()
      .split('\n')
      .map(Number);
    const commandPid = Number(await waitForFile(commandPidFile));
    const descendantPid = Number(await waitForFile(descendantPidFile));

    const signalStartedAt = Date.now();
    child.kill('SIGTERM');
    expect(await waitForExit(child)).not.toBe(0);
    expect(Date.now() - signalStartedAt).toBeLessThan(3_000);
    expect(workerPids.every((pid) => !isAlive(pid))).toBe(true);
    expect(isAlive(commandPid)).toBe(false);
    expect(isAlive(descendantPid)).toBe(false);
  });

  it('catches a planted cleanup regression without leaving a permanent orphan', async () => {
    const source = await readFile(HARNESS, 'utf8');
    const planted = source.replace(
      `for pid in "\${worker_pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done`,
      `for pid in "\${worker_pids[@]}"; do
    : # planted regression: worker is not stopped by the trap
  done`,
    );
    expect(planted).not.toBe(source);

    const mutant = join(tempDir, 'with-cpu-load-no-kill.sh');
    const pidFile = join(tempDir, 'mutant-workers.pid');
    await writeFile(mutant, planted);
    await chmod(mutant, 0o755);

    const startedAt = Date.now();
    const child = runHarness(mutant, pidFile);
    const pids = (await waitForFile(pidFile))
      .trim()
      .split('\n')
      .map(Number);

    expect(await waitForExit(child)).toBe(0);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(1_500);
    expect(pids.every((pid) => !isAlive(pid))).toBe(true);
  }, 7_000);
});
