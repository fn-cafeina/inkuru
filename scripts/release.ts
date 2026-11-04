import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const SEMVER = /^\d+\.\d+\.\d+$/;

type Json = Record<string, unknown>;

function parse(text: string, file: string): Json {
  try {
    return JSON.parse(text) as Json;
  } catch (err) {
    throw new Error(`${file} no es JSON válido: ${String(err)}`);
  }
}

function expoObject(appJson: string): Json {
  const expo = parse(appJson, 'app.json').expo;
  if (typeof expo !== 'object' || expo === null) {
    throw new Error('app.json sin objeto "expo"');
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
    throw new Error(`versión inválida: ${version} (formato X.Y.Z)`);
  }
  const app = parse(appJson, 'app.json');
  const expo = app.expo;
  if (typeof expo !== 'object' || expo === null) {
    throw new Error('app.json sin objeto "expo"');
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
    throw new Error(`git ${args.join(' ')} falló:\n${res.stderr.trim()}`);
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
      `versiones desincronizadas: app.json ${before} vs package.json ${other}`,
    );
  }
  if (before === version) {
    throw new Error(`ya estás en ${version}`);
  }
  if (git(['rev-parse', '--abbrev-ref', 'HEAD']).trim() !== 'main') {
    throw new Error('la release sale de main, no de otra rama');
  }
  if (git(['status', '--porcelain']).trim() !== '') {
    throw new Error('working tree sucio: commiteá o descartá antes de releasear');
  }
  if (gitQuiet(['rev-parse', '-q', '--verify', `refs/tags/${tag}`])) {
    throw new Error(`el tag ${tag} ya existe en local`);
  }
  if (git(['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]).trim() !== '') {
    throw new Error(`el tag ${tag} ya existe en origin`);
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
      throw new Error('falta la versión: bun run release X.Y.Z [--dry-run]');
    }
    const tag = `v${version}`;
    const appText = readFileSync('app.json', 'utf8');
    const pkgText = readFileSync('package.json', 'utf8');
    const [nextApp, nextPkg] = bumpVersions(appText, pkgText, version);
    assertReady(appText, pkgText, version, tag);

    if (dryRun) {
      console.log(`Dry run para ${tag}, nada se toca:`);
      console.log(`  1. app.json expo.version -> ${version}`);
      console.log(`  2. package.json version -> ${version}`);
      console.log(`  3. git commit -m "chore(release): ${tag}"`);
      console.log(`  4. git tag -a ${tag} -m ${tag}`);
      console.log('  5. git push origin main --follow-tags');
      return;
    }

    writeFileSync('app.json', nextApp);
    writeFileSync('package.json', nextPkg);
    done.push(`versiones escritas en ${version}`);
    git(['add', 'app.json', 'package.json']);
    git(['commit', '-m', `chore(release): ${tag}`]);
    committed = true;
    done.push(`commit chore(release): ${tag}`);
    git(['tag', '-a', tag, '-m', tag]);
    done.push(`tag ${tag}`);
    git(['push', 'origin', 'main', '--follow-tags']);
    done.push('push a origin/main');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nRelease falló: ${msg}`);
    if (done.length > 0) {
      console.error('Completado:');
      for (const step of done) {
        console.error(`  - ${step}`);
      }
      console.error(
        committed
          ? `Descartar: git tag -d v${version}; git reset --hard HEAD~1`
          : 'Descartar: git checkout -- app.json package.json',
      );
    }
    process.exit(1);
  }
  console.log(`Listo: v${version} publicado. Actions arma la release.`);
}

if (import.meta.main) {
  main();
}