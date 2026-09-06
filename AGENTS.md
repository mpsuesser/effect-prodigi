# AGENTS.md

## Commands

```bash
bun run check       # lint + format + typecheck (auto-fixes)
bun run test        # vitest run (all tests)
bun run typecheck   # tsgo (not tsc)

# Single test file or by name
bunx vitest run test/ProdigiClient.test.ts
bunx vitest run -t "returns decoded OrderResponse"
```

CI gate order: `bun run check` then `bun run test` then `bun run typecheck`. All three must pass.

## Toolchain

- **Bun 1.4.0** as runtime and package manager (`bun.lock`, not `package-lock.json`)
- **vite-plus** (`vp`) is the unified build/lint/format tool. There are no standalone eslint, prettier, or biome configs — everything is in `vite.config.ts`
- **tsgo** for typechecking (native TS compiler), not `tsc`
- **Effect v4 RC** (`4.0.0-rc.112`) — do not use v3 patterns. Read the installed `node_modules/effect` source when unsure about APIs. Errors use `Schema.TaggedError` (renamed from `TaggedErrorClass`) and `Schema.Defect()`.

## Formatting

Configured in `vite.config.ts` `fmt` section: **tabs**, single quotes, semicolons, **no trailing commas**, printWidth 80.

## Architecture

Single-package library (not a monorepo). Zero runtime dependencies — only `effect` as peer.

```
src/
  index.ts           # barrel — all public exports
  Errors.ts          # ProdigiError (single TaggedErrorClass, discriminated by `reason`)
  ProdigiConfig.ts   # Config service (API key + environment)
  ProdigiClient.ts   # HTTP client service (11 endpoint methods)
  Schemas.ts         # Response domain schemas (Order, Item, Shipment, Quote, Product, etc.)
  Requests.ts        # Request body schemas (CreateOrderInput, GetOrdersParams, etc.)
  Responses.ts       # Response envelope schemas (OrderResponse, QuoteResponse, etc.)
test/
  *.test.ts          # One test file per source module
```

## Conventions

- **Imports use `.ts` extensions** (`import { Foo } from './Schemas.ts'`) — ESM with `allowImportingTsExtensions`
- **`exactOptionalPropertyTypes: true`** — `undefined` cannot be assigned to optional properties
- **Services use namespace pattern**: `ProdigiClient.Service`, `ProdigiConfig.Service`, `ProdigiClient.layer`
- **Nullable API fields** decode to `Option` via `Schema.OptionFromNullOr` in response schemas
- **Optional request fields** use `Schema.optionalKey` (key omitted from JSON when absent)
- **All exports** go through `src/index.ts` barrel with JSDoc including `@since`
- **Tests**: effectful tests use `@effect/vitest` `it.effect()`; pure tests use plain `vitest`. Client tests use a `makeMockClient` pattern with `HttpClient.make` and route matching

## Prodigi API binding

Maps the Prodigi print-on-demand REST API v4.0 (`/v4.0/` prefix). The API uses `X-API-Key` header auth and returns JSON with an `outcome` field on most responses.

The client validates `outcome` against known success values (`ok`, `created`, `updated`, `cancelled`, `onhold`) and maps error outcomes to typed `ProdigiError` reasons. Quotes also accept `CreatedWithIssues` and preserve top-level issues, including Prodigi's US sales-tax warning; callers decide whether those warnings permit using the quote. Order creation retains its typed failure for that outcome. The `/products/spine` endpoint is a special case — it returns `{ success, message, spineInfo }` without the `outcome` envelope.
