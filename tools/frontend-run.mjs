import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

function isPortAvailable(port, host = '0.0.0.0') {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function findAvailablePort(startPort, maxAttempts = 20) {
  for (let port = startPort; port < startPort + maxAttempts; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }

  throw new Error(
    `No available port found between ${startPort} and ${startPort + maxAttempts - 1}.`,
  );
}

async function main() {
  const mode = process.argv[2] ?? 'dev';

  if (!['dev', 'build', 'start'].includes(mode)) {
    throw new Error(`Unsupported mode "${mode}". Use one of: dev, build, start.`);
  }

  const args = ['exec', 'next', '--', mode];

  if (mode === 'dev' || mode === 'start') {
    const defaultPort = Number(process.env.PORT ?? 3000);
    const port = await findAvailablePort(defaultPort);

    if (port !== defaultPort) {
      console.log(`[frontend] Port ${defaultPort} is in use. Starting on port ${port} instead.`);
    }

    args.push('-H', '0.0.0.0', '-p', String(port));
  }

  const child = spawn(npmCommand, args, {
    stdio: 'inherit',
    shell: true,
    cwd: path.resolve(process.cwd(), 'frontend'),
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
