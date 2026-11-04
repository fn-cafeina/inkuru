declare module '*.css';

// Bun sets this on the entry module, used by scripts/release.ts to skip
// the CLI when imported. Avoids pulling in bun-types for one member.
interface ImportMeta {
  main: boolean;
}

// Only the bun test API the self-check scripts use. Avoids pulling in
// bun-types for one declaration.
declare module 'bun:test' {
  export const mock: {
    module(specifier: string, factory: () => unknown): void;
  };
}
