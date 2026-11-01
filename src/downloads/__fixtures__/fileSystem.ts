// In-memory stand-in for the parts of expo-file-system the download layer uses.
// Paths are plain strings; the real module hands out file:// URIs.

type Node = { kind: 'dir' } | { kind: 'file'; content: string };

export type FakeFileSystem = {
  /** Exports to hand to `mock.module('expo-file-system', ...)`. */
  module: {
    Directory: typeof FakeDirectory;
    File: typeof FakeFile;
    Paths: { document: string };
  };
  /** Fail every delete under these paths (file or directory). */
  failDeletes: Set<string>;
  /** URLs `File.downloadFileAsync` must reject. */
  failUrls: Set<string>;
  /** Write a file, creating parent directories. */
  write(path: string, content: string): void;
  read(path: string): string | undefined;
  exists(path: string): boolean;
};

const DOCUMENT = '/documents';

function normalize(path: string): string {
  return path.replace(/\/+$/, '') || '/';
}

function join(...parts: string[]): string {
  return normalize(
    parts
      .filter((part) => part.length > 0)
      .join('/')
      .replace(/\/{2,}/g, '/'),
  );
}

class FakeFile {
  readonly uri: string;

  constructor(...parts: (string | { uri: string })[]) {
    this.uri = join(...parts.map((part) => (typeof part === 'string' ? part : part.uri)));
  }

  get name(): string {
    return this.uri.slice(this.uri.lastIndexOf('/') + 1);
  }

  get exists(): boolean {
    return store.get(this.uri)?.kind === 'file';
  }

  create(): void {
    this.writeSync('');
  }

  delete(): void {
    if (failDeletes.has(this.uri)) {
      throw new Error(`delete failed: ${this.uri}`);
    }

    store.delete(this.uri);
  }

  textSync(): string {
    const node = store.get(this.uri);

    if (node?.kind !== 'file') {
      throw new Error(`no file: ${this.uri}`);
    }

    return node.content;
  }

  async text(): Promise<string> {
    return this.textSync();
  }

  async write(content: string): Promise<void> {
    this.writeSync(content);
  }

  async move(target: FakeFile): Promise<void> {
    const node = store.get(this.uri);

    if (!node) {
      throw new Error(`no file: ${this.uri}`);
    }

    store.set(target.uri, node);
    store.delete(this.uri);
  }

  private writeSync(content: string): void {
    createParents(this.uri);
    store.set(this.uri, { kind: 'file', content });
  }

  static async downloadFileAsync(
    url: string,
    target: FakeFile,
  ): Promise<FakeFile> {
    if (failUrls.has(url)) {
      throw new Error(`download failed: ${url}`);
    }

    createParents(target.uri);
    store.set(target.uri, { kind: 'file', content: `page:${url}` });

    return target;
  }
}

class FakeDirectory {
  readonly uri: string;

  constructor(...parts: (string | { uri: string })[]) {
    this.uri = join(...parts.map((part) => (typeof part === 'string' ? part : part.uri)));
  }

  get name(): string {
    return this.uri.slice(this.uri.lastIndexOf('/') + 1);
  }

  get exists(): boolean {
    return store.get(this.uri)?.kind === 'dir';
  }

  create(): void {
    createParents(this.uri);
    store.set(this.uri, { kind: 'dir' });
  }

  delete(): void {
    if (failDeletes.has(this.uri)) {
      throw new Error(`delete failed: ${this.uri}`);
    }

    for (const key of [...store.keys()]) {
      if (key === this.uri || key.startsWith(`${this.uri}/`)) {
        store.delete(key);
      }
    }
  }

  list(): (FakeFile | FakeDirectory)[] {
    const prefix = this.uri === '/' ? '/' : `${this.uri}/`;
    const children: (FakeFile | FakeDirectory)[] = [];

    for (const [key, node] of store) {
      if (!key.startsWith(prefix)) {
        continue;
      }

      if (key.slice(prefix.length).includes('/')) {
        continue;
      }

      children.push(node.kind === 'dir' ? new FakeDirectory(key) : new FakeFile(key));
    }

    return children;
  }
}

const store = new Map<string, Node>([
  ['/', { kind: 'dir' }],
  [DOCUMENT, { kind: 'dir' }],
]);
const failDeletes = new Set<string>();
const failUrls = new Set<string>();

function createParents(path: string): void {
  const segments = path.split('/').filter((segment) => segment.length > 0);
  let current = '';

  for (const segment of segments.slice(0, -1)) {
    current += `/${segment}`;
    store.set(current, store.get(current) ?? { kind: 'dir' });
  }
}

export function createFakeFileSystem(): FakeFileSystem {
  return {
    module: {
      Directory: FakeDirectory,
      File: FakeFile,
      Paths: { document: DOCUMENT },
    },
    failDeletes,
    failUrls,
    write(path, content) {
      createParents(path);
      store.set(normalize(path), { kind: 'file', content });
    },
    read(path) {
      const node = store.get(normalize(path));

      return node?.kind === 'file' ? node.content : undefined;
    },
    exists(path) {
      return store.has(normalize(path));
    },
  };
}
