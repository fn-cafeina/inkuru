declare module '*.css';

// Only the bun test API the self-check scripts use. Avoids pulling in
// bun-types for one declaration.
declare module 'bun:test' {
  export const mock: {
    module(specifier: string, factory: () => unknown): void;
  };
}
