import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const SEMVER = /^\d+\.\d+\.\d+$/;

type Json = Record<string, unknown>;

function parse(text: string, file: string): Json {
  try {
    return JSON.parse(text) as Json;
  } catch (err) {
    throw new Error(`${file} is not valid JSON: ${String(err)}`);
  }
}

function expoObject(appJson: string): Json {
  const expo = parse(appJson, 'app.json').expo;
  if (typeof expo !== 'object' || expo === null) {
    throw new Error('app.json has no "expo" object');
  }
  return expo as Json;
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function expoVersion(appJson: string): string {
  return stringField(expoObject(appJson).version);
}

function pkgVersion(pkgJson: string): string {
  return stringField(parse(pkgJson, 'package.json').version);
}

export function bumpVersions(
  appJson: string,
  pkgJson: string,
  version: string,
): [string, string] {
  if (!SEMVER.test(version)) {
    throw new Error(`invalid version: ${version} (expected X.Y.Z)`);
  }
  const app = parse(appJson, 'app.json');
  const expo = app.expo;
  if (typeof expo !== 'object' || expo === null) {
    throw new Error('app.json has no "expo" object');
  }
  const pkg = parse(pkgJson, 'package.json');
  (expo as Json).version = version;
  pkg.version = version;
  return [
    `${JSON.stringify(app, null, 2)}\n`,
    `${JSON.stringify(pkg, null, 2)}\n`,
  ];
}

function git(args: string[]): string {
  const res = spawnSync('git', args, { encoding: 'utf8' });
  if (res.error) {
    throw new Error(`git ${args.join(' ')}: ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed:\n${res.stderr.trim()}`);
  }
  return res.stdout;
}

function gitQuiet(args: string[]): boolean {
  const res = spawnSync('git', args, { encoding: 'utf8' });
  return !res.error && res.status === 0;
}

function assertReady(
  appText: string,
  pkgText: string,
  version: string,
  tag: string,
): void {
  const before = expoVersion(appText);
  const other = pkgVersion(pkgText);
  if (before !== other) {
    throw new Error(
      `versions out of sync: app.json ${before} vs package.json ${other}`,
    );
  }
  if (before === version) {
    throw new Error(`already at ${version}`);
  }
  if (git(['rev-parse', '--abbrev-ref', 'HEAD']).trim() !== 'main') {
    throw new Error('releases are cut from main, not another branch');
  }
  if (git(['status', '--porcelain']).trim() !== '') {
    throw new Error('working tree dirty: commit or discard before releasing');
  }
  if (gitQuiet(['rev-parse', '-q', '--verify', `refs/tags/${tag}`])) {
    throw new Error(`tag ${tag} already exists locally`);
  }
  if (git(['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]).trim() !== '') {
    throw new Error(`tag ${tag} already exists on origin`);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const version = args.find((arg) => !arg.startsWith('--'));
  const done: string[] = [];
  let committed = false;

  try {
    if (!version) {
      throw new Error('missing version: bun run release X.Y.Z [--dry-run]');
    }
    const tag = `v${version}`;
    const appText = readFileSync('app.json', 'utf8');
    const pkgText = readFileSync('package.json', 'utf8');
    const [nextApp, nextPkg] = bumpVersions(appText, pkgText, version);
    assertReady(appText, pkgText, version, tag);

    if (dryRun) {
      console.log(`Dry run for ${tag}, nothing is touched:`);
      console.log(`  1. app.json expo.version -> ${version}`);
      console.log(`  2. package.json version -> ${version}`);
      console.log(`  3. git commit -m "chore(release): ${tag}"`);
      console.log(`  4. git tag -a ${tag} -m ${tag}`);
      console.log('  5. git push origin main --follow-tags');
      return;
    }

    writeFileSync('app.json', nextApp);
    writeFileSync('package.json', nextPkg);
    done.push(`versions written at ${version}`);
    git(['add', 'app.json', 'package.json']);
    git(['commit', '-m', `chore(release): ${tag}`]);
    committed = true;
    done.push(`commit chore(release): ${tag}`);
    git(['tag', '-a', tag, '-m', tag]);
    done.push(`tag ${tag}`);
    git(['push', 'origin', 'main', '--follow-tags']);
    done.push('push to origin/main');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nRelease failed: ${msg}`);
    if (done.length > 0) {
      console.error('Completed:');
      for (const step of done) {
        console.error(`  - ${step}`);
      }
      console.error(
        committed
          ? `Discard: git tag -d v${version}; git reset --hard HEAD~1`
          : 'Discard: git checkout -- app.json package.json',
      );
    }
    process.exit(1);
  }
  console.log(`Done: v${version} published. Actions builds the release.`);
}

if (import.meta.main) {
  main();
}