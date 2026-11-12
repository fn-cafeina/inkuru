import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

function collect(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      continue;
    }
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(path, out);
    } else if (entry.isFile() && entry.name.endsWith('.check.ts')) {
      out.push(path);
    }
  }
}

const files: string[] = [];

collect('.', files);
files.sort();

for (const file of files) {
  const res = spawnSync('bun', [file], { stdio: 'inherit' });
  if (res.error) {
    throw res.error;
  }
  if (res.status !== 0) {
    console.error(`FAIL ${file}`);
    process.exit(res.status ?? 1);
  }
}
