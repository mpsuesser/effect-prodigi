# effect-prodigi

[![npm](https://img.shields.io/npm/v/effect-prodigi)](https://www.npmjs.com/package/effect-prodigi)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Type-safe [Effect v4](https://effect.website) binding for the [Prodigi print-on-demand REST API](https://www.prodigi.com/print-api/) (`/v4.0/`).

Modeled precisely against the [Prodigi v4.0 API specification](https://www.prodigi.com/print-api/docs/). Every endpoint, request field, response field, outcome code, and error shape maps 1:1 to the documented API. Nullable response fields decode to `Option`, optional request fields are omitted from the wire when absent, and every API outcome the docs enumerate is handled as a typed error reason.

Zero runtime dependencies — only `effect` as a peer.

## Features

- **11 endpoint methods** covering orders, order actions, quotes, products, and photobook spine
- **`Schema.Class` response models** — fully decoded domain types with `Option` for nullable fields and `DateTimeUtc` for timestamps
- **`Schema.Class` request models** — typed input schemas with `optionalKey` for fields the API doesn't require
- **Single typed error** — `ProdigiError` with a `reason` discriminant covering all documented API outcomes and HTTP-level failures
- **`Redacted` API key** — secrets never leak in logs or error reports
- **Tracing built in** — every endpoint method is wrapped with `Effect.fn` and annotates the current span with relevant identifiers (`prodigi.orderId`, `prodigi.sku`, `prodigi.idempotencyKey`)
- **Webhook support** — `CallbackEvent` schema with `decodeCallbackEvent` and `isCallbackEvent` for validating CloudEvent payloads at your webhook handler boundary

## Install

```sh
npm install effect-prodigi effect@4.0.0-beta.43
```

```sh
bun add effect-prodigi effect@4.0.0-beta.43
```

## Configuration

The library reads configuration through Effect's `Config` system. When using environment variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `PRODIGI_API_KEY` | Yes | — | Your Prodigi API key (stored as `Redacted`) |
| `PRODIGI_ENVIRONMENT` | No | `sandbox` | `sandbox` or `live` |

The environment determines the base URL:

- `sandbox` → `https://api.sandbox.prodigi.com`
- `live` → `https://api.prodigi.com`

All requests are sent to the `/v4.0/` prefix with `X-API-Key` header auth and `Content-Type: application/json`.

## Quick Start

```ts
import { Effect, Layer } from 'effect';
import { FetchHttpClient } from 'effect/unstable/http';
import { ProdigiClient } from 'effect-prodigi';

const program = Effect.gen(function* () {
	const client = yield* ProdigiClient.Service;

	// Create an order
	const { order } = yield* client.createOrder({
		shippingMethod: 'Standard',
		recipient: {
			name: 'Jane Smith',
			address: {
				line1: '10 Downing Street',
				postalOrZipCode: 'SW1A 2AA',
				countryCode: 'GB',
				townOrCity: 'London'
			}
		},
		items: [
			{
				sku: 'GLOBAL-PHO-4x6',
				copies: 1,
				sizing: 'fillPrintArea',
				assets: [
					{
						printArea: 'default',
						url: 'https://example.com/photo.jpg'
					}
				]
			}
		]
	});

	yield* Effect.logInfo(`Created order ${order.id}`);
});

// Provide the default layer (reads PRODIGI_API_KEY / PRODIGI_ENVIRONMENT
// from env) plus an HTTP client
program.pipe(
	Effect.provide(ProdigiClient.defaultLayer),
	Effect.provide(FetchHttpClient.layer),
	Effect.runPromise
);
```

## Layer Wiring

### `ProdigiClient.defaultLayer`

Reads config from the environment via `ProdigiConfig.layer` and requires only an `HttpClient` to be provided separately:

```ts
import { Layer } from 'effect';
import { FetchHttpClient } from 'effect/unstable/http';
import { ProdigiClient } from 'effect-prodigi';

const MainLayer = Layer.merge(
	ProdigiClient.defaultLayer,
	FetchHttpClient.layer
);
```

### `ProdigiClient.layer`

Lower-level layer that requires both `ProdigiConfig.Service` and `HttpClient` in context. Use this when you want to provide config programmatically or swap the HTTP client for testing:

```ts
import { Layer } from 'effect';
import { FetchHttpClient } from 'effect/unstable/http';
import { ProdigiClient, ProdigiConfig } from 'effect-prodigi';

const CustomLayer = ProdigiClient.layer.pipe(
	Layer.provide(ProdigiConfig.make({
		apiKey: 'my-api-key',
		environment: 'live'
	})),
	Layer.provide(FetchHttpClient.layer)
);
```

### `ProdigiConfig.make`

Construct a config layer from explicit values without reading `Config`. Useful for tests and programmatic construction:

```ts
import { ProdigiConfig } from 'effect-prodigi';

const TestConfig = ProdigiConfig.make({
	apiKey: 'test-key',
	environment: 'sandbox' // optional, defaults to 'sandbox'
});
```

### `ProdigiConfig.layer`

Reads from the Effect `Config` system (environment variables by default). The API key is read via `Config.redacted` so it never appears in logs or error reports.

## Client Methods

All methods return `Effect<Response, ProdigiError>`. The client is accessed via `yield* ProdigiClient.Service`.

### Orders

| Method | Endpoint | Description |
|---|---|---|
| `createOrder(input)` | `POST /v4.0/orders` | Create a new order |
| `getOrder(orderId)` | `GET /v4.0/orders/:id` | Get order by Prodigi order ID |
| `getOrders(params?)` | `GET /v4.0/orders` | List orders with optional filters |

`getOrders` accepts an optional `GetOrdersParams` with `top`, `skip`, `createdFrom`, `createdTo`, `status`, `orderIds`, and `merchantReferences`. Array params are serialised as comma-separated strings.

### Order Actions

| Method | Endpoint | Description |
|---|---|---|
| `getActions(orderId)` | `GET /v4.0/orders/:id/actions` | Get available actions for an order |
| `cancelOrder(orderId)` | `POST /v4.0/orders/:id/actions/cancel` | Cancel an order |
| `updateShippingMethod(orderId, input)` | `POST /v4.0/orders/:id/actions/updateShippingMethod` | Change shipping method |
| `updateRecipient(orderId, input)` | `POST /v4.0/orders/:id/actions/updateRecipient` | Update recipient details |
| `updateMetadata(orderId, input)` | `POST /v4.0/orders/:id/actions/updateMetadata` | Replace order metadata |

### Quotes

| Method | Endpoint | Description |
|---|---|---|
| `createQuote(input)` | `POST /v4.0/quotes` | Get a pricing quote without placing an order |

### Products

| Method | Endpoint | Description |
|---|---|---|
| `getProduct(sku)` | `GET /v4.0/products/:sku` | Get product details by SKU |
| `getSpine(input)` | `POST /v4.0/products/spine` | Get photobook spine width |

The `/products/spine` endpoint is a special case — it returns `{ success, message, spineInfo }` without the standard `outcome` envelope used by all other endpoints.

## Error Handling

Every client method fails with `ProdigiError`, a single `Schema.TaggedErrorClass` discriminated by `reason`:

```ts
import { Effect, Match } from 'effect';
import { ProdigiClient, ProdigiError } from 'effect-prodigi';

const program = Effect.gen(function* () {
	const client = yield* ProdigiClient.Service;
	return yield* client.getOrder('ord_123');
}).pipe(
	Effect.catchTag('ProdigiError', (err) =>
		Match.value(err.reason).pipe(
			Match.when('EntityNotFound', () =>
				Effect.logWarning('Order not found')
			),
			Match.when('ValidationFailed', () =>
				Effect.logError('Invalid request')
			),
			Match.orElse(() =>
				Effect.logError(`Prodigi error: ${err.reason} — ${err.message}`)
			)
		)
	)
);
```

### Error Reasons

These map directly to documented Prodigi API outcomes and HTTP status codes:

| Reason | Source |
|---|---|
| `ValidationFailed` | `outcome: "ValidationFailed"` or HTTP 400 |
| `EntityNotFound` | `outcome: "EntityNotFound"` or HTTP 404 |
| `EndpointDoesNotExist` | `outcome: "EndpointDoesNotExist"` |
| `MethodNotAllowed` | `outcome: "MethodNotAllowed"` or HTTP 405 |
| `InvalidContentType` | `outcome: "InvalidContentType"` or HTTP 415 |
| `InternalServerError` | `outcome: "InternalServerError"` or HTTP 500 |
| `TimedOut` | `outcome: "TimedOut"` |
| `CreatedWithIssues` | `outcome: "CreatedWithIssues"` |
| `AlreadyExists` | `outcome: "AlreadyExists"` |
| `FailedToCancel` | `outcome: "FailedToCancel"` |
| `ActionNotAvailable` | `outcome: "ActionNotAvailable"` |
| `PartiallyUpdated` | `outcome: "PartiallyUpdated"` |
| `FailedToUpdate` | `outcome: "FailedToUpdate"` |
| `HttpError` | Transport failures, HTTP 401, or unmapped status codes |
| `DecodeError` | Response body failed schema decoding |

### Outcome Validation

The client validates the `outcome` field on every response against known success values (`Ok`, `Created`, `Updated`, `Cancelled`, `OnHold`). Any outcome not in that set is checked against the reason map and surfaced as a typed `ProdigiError`. This means outcomes like `CreatedWithIssues` appear as errors you can catch and handle, matching the Prodigi API's semantics.

`ProdigiError` also carries optional `statusCode` and `cause` fields for debugging:

```ts
Effect.catchTag('ProdigiError', (err) => {
	// err.reason    — typed literal discriminant
	// err.message   — human-readable description
	// err.statusCode — HTTP status (when applicable)
	// err.cause     — underlying error (when applicable)
});
```

## Request Schemas

All request bodies are `Schema.Class` types. Optional fields use `Schema.optionalKey` — the key is omitted from the serialised JSON when absent, matching the Prodigi API's expectations.

| Schema | Used by |
|---|---|
| `CreateOrderInput` | `createOrder` |
| `GetOrdersParams` | `getOrders` |
| `UpdateShippingMethodInput` | `updateShippingMethod` |
| `UpdateRecipientInput` | `updateRecipient` |
| `UpdateMetadataInput` | `updateMetadata` |
| `CreateQuoteInput` | `createQuote` |
| `GetSpineInput` | `getSpine` |

Supporting schemas: `RecipientInput`, `AddressInput`, `CreateItemInput`, `CreateAssetInput`, `RecipientCostInput`, `BrandingInput`, `BrandingAssetInput`, `PackingSlipInput`, `QuoteItemInput`, `QuoteAssetInput`, `UpdateAddressInput`.

## Response Schemas

Response envelopes include the `outcome` field used for success/failure discrimination:

| Schema | Returned by |
|---|---|
| `OrderResponse` | `createOrder`, `getOrder` |
| `OrdersResponse` | `getOrders` |
| `ActionsResponse` | `getActions` |
| `CancelOrderResponse` | `cancelOrder` |
| `UpdateShippingResponse` | `updateShippingMethod` |
| `UpdateRecipientResponse` | `updateRecipient` |
| `UpdateMetadataResponse` | `updateMetadata` |
| `QuoteResponse` | `createQuote` |
| `ProductResponse` | `getProduct` |
| `SpineResponse` | `getSpine` |
| `ErrorResponse` | Decoded internally from non-2xx responses |

`OrdersResponse` includes `hasMore: boolean` and `nextUrl: Option<string>` for pagination.

## Domain Schemas

All response domain types are `Schema.Class` with `Option` for nullable fields and `DateTimeUtc` for timestamps.

**Order domain:** `Order`, `Item`, `Asset`, `Recipient`, `Address`, `Status`, `StatusDetails`, `Issue`, `AuthorisationDetails`, `AuthorisationPaymentDetails`, `Shipment`, `ShipmentItem`, `Carrier`, `FulfillmentLocation`, `Tracking`, `Charge`, `ChargeItem`, `Cost`, `PackingSlip`, `Branding`, `BrandingAsset`, `OrderActions`, `ActionStatus`, `ShipmentUpdateResult`

**Quote domain:** `Quote`, `QuoteItem`, `QuoteAsset`, `QuoteShipment`, `QuoteIssue`, `CostSummary`

**Product domain:** `Product`, `Variant`, `ProductDimensions`, `PrintArea`, `PrintAreaDimensions`, `SpineInfo`

**Enums (as `Schema.Literals`):** `ShippingMethod`, `Sizing`, `OrderStage`, `DetailStage`, `AssetStatus`, `ItemStatus`, `ShipmentStatus`, `ChargeType`, `ActionAvailability`

**Webhook:** `CallbackEvent` (CloudEvent payload)

## Webhook Handling

Prodigi sends [CloudEvent](https://cloudevents.io/) webhooks on order stage changes. The library exports a schema and helpers for validating these at your handler boundary:

```ts
import { Effect } from 'effect';
import { decodeCallbackEvent, isCallbackEvent } from 'effect-prodigi';

// Effectful decoding at your webhook handler boundary
const handleWebhook = (body: unknown) =>
	Effect.gen(function* () {
		const event = yield* decodeCallbackEvent(body);
		yield* Effect.logInfo(`Received ${event.type} for ${event.subject}`);
		// event.data contains the order-specific payload
	});

// Or as a synchronous type guard
if (isCallbackEvent(payload)) {
	// payload is typed as CallbackEvent
}
```

## Testing

Construct a mock `HttpClient` and provide it alongside `ProdigiConfig.make` to test against the real client layer without hitting the Prodigi API:

```ts
import { describe, expect, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { HttpClient, HttpClientResponse } from 'effect/unstable/http';
import { ProdigiClient, ProdigiConfig } from 'effect-prodigi';

const mockClient = HttpClient.make((request) =>
	Effect.succeed(
		HttpClientResponse.fromWeb(
			request,
			new Response(
				JSON.stringify({
					outcome: 'Ok',
					order: { id: 'ord_123', /* ... */ }
				}),
				{
					status: 200,
					headers: { 'content-type': 'application/json' }
				}
			)
		)
	)
);

const TestLayer = ProdigiClient.layer.pipe(
	Layer.provide(ProdigiConfig.make({ apiKey: 'test-key' })),
	Layer.provide(Layer.succeed(HttpClient.HttpClient, mockClient))
);

describe('ProdigiClient', () => {
	it.effect('fetches an order', () =>
		Effect.gen(function* () {
			const client = yield* ProdigiClient.Service;
			const resp = yield* client.getOrder('ord_123');
			expect(resp.order.id).toBe('ord_123');
		}).pipe(Effect.provide(TestLayer))
	);

	it.effect('handles errors', () =>
		Effect.gen(function* () {
			const client = yield* ProdigiClient.Service;
			const error = yield* Effect.flip(
				client.getOrder('ord_nonexistent')
			);
			expect(error.reason).toBe('EntityNotFound');
		}).pipe(Effect.provide(/* layer with 404 mock */))
	);
});
```

## Modules

| Export | Purpose |
|---|---|
| `ProdigiClient` | HTTP client service (`Service`, `layer`, `defaultLayer`) |
| `ProdigiConfig` | Config service (`Service`, `layer`, `make`) with `Redacted` API key |
| `ProdigiError` | Single `TaggedErrorClass` with `reason` discriminant |
| `ProdigiErrorReason` | Literal union type of all 15 error reason codes |
| `ProdigiEnvironment` | `'sandbox' \| 'live'` literal type |
| Domain schemas | 40+ `Schema.Class` types for orders, quotes, products, shipments |
| Request schemas | `CreateOrderInput`, `CreateQuoteInput`, `GetOrdersParams`, etc. |
| Response schemas | `OrderResponse`, `QuoteResponse`, `ProductResponse`, etc. |
| `CallbackEvent` | CloudEvent webhook schema |
| `decodeCallbackEvent` | `Schema.decodeUnknownEffect(CallbackEvent)` |
| `isCallbackEvent` | `Schema.is(CallbackEvent)` type guard |

## Development

```sh
bun install                # install dependencies
bun run check              # lint + format + typecheck (auto-fix)
bun run test               # run all tests
bun run typecheck          # tsgo type-check only
# Single test file
bunx vitest run test/ProdigiClient.test.ts

# By test name
bunx vitest run -t "returns decoded OrderResponse"
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
