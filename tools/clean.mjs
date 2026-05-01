import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const targets = [
  '.next',
  'frontend/.next',
  'frontend/tsconfig.tsbuildinfo',
  'tsconfig.tsbuildinfo',
  'dev-server.log',
];

for (const target of targets) {
  const absolute = resolve(root, target);

  if (!absolute.startsWith(root)) {
    throw new Error(`Refusing to delete outside project root: ${absolute}`);
  }

  rmSync(absolute, { recursive: true, force: true });
}
