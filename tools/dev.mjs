import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

const processes = [];

function run(label, args, options = {}) {
  const child = spawn(npmCommand, args, {
    stdio: 'inherit',
    shell: true,
    ...options,
  });

  processes.push(child);

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
      shutdown(code);
    }
  });

  return child;
}

function backendHasDevScript() {
  const backendPackagePath = join(process.cwd(), 'backend', 'package.json');

  if (!existsSync(backendPackagePath)) {
    return false;
  }

  try {
    const backendPackage = JSON.parse(readFileSync(backendPackagePath, 'utf8'));
    return Boolean(backendPackage.scripts?.dev);
  } catch {
    return false;
  }
}

function shutdown(code = 0) {
  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

if (backendHasDevScript()) {
  run('backend', ['run', 'dev', '--prefix', 'backend']);
} else {
  console.log('[backend] Supabase is managed externally. No local backend process configured yet.');
}

run('frontend', ['run', 'dev:frontend']);
