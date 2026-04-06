/**
 * Prodigi API client service.
 *
 * Provides typed methods for every documented Prodigi v4.0 endpoint.
 * All methods fail with `ProdigiError` and require no runtime
 * dependencies beyond the service itself.
 *
 * @since 0.1.0
 */
import { Effect, Layer, pipe, Redacted, Result, ServiceMap } from 'effect';
import * as Arr from 'effect/Array';
import * as Option from 'effect/Option';
import * as R from 'effect/Record';
import * as Schema from 'effect/Schema';
import {
	HttpClient,
	HttpClientRequest,
	HttpClientResponse
} from 'effect/unstable/http';

import { ProdigiError, type ProdigiErrorReason } from './Errors.ts';
import { ProdigiConfig } from './ProdigiConfig.ts';
import type {
	CreateOrderInput,
	CreateQuoteInput,
	GetOrdersParams,
	GetSpineInput,
	UpdateMetadataInput,
	UpdateRecipientInput,
	UpdateShippingMethodInput
} from './Requests.ts';
import {
	ActionsResponse,
	CancelOrderResponse,
	ErrorResponse,
	OrderResponse,
	OrdersResponse,
	ProductResponse,
	QuoteResponse,
	SpineResponse,
	UpdateMetadataResponse,
	UpdateRecipientResponse,
	UpdateShippingResponse
} from './Responses.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_VERSION = '/v4.0';

/**
 * Structural constraint for response bodies that include an `outcome` field.
 * All Prodigi API success response schemas satisfy this shape.
 */
interface WithOutcome {
	readonly outcome: string;
}

/**
 * Lower-cased outcome → error reason mapping. Outcomes not present here
 * are either success outcomes or unknown (treated as pass-through).
 */
const OUTCOME_REASON_MAP: Readonly<Record<string, ProdigiErrorReason>> = {
	validationfailed: 'ValidationFailed',
	entitynotfound: 'EntityNotFound',
	endpointdoesnotexist: 'EndpointDoesNotExist',
	methodnotallowed: 'MethodNotAllowed',
	invalidcontenttype: 'InvalidContentType',
	internalservererror: 'InternalServerError',
	timedout: 'TimedOut',
	createdwithissues: 'CreatedWithIssues',
	alreadyexists: 'AlreadyExists',
	failedtocancel: 'FailedToCancel',
	actionnotavailable: 'ActionNotAvailable',
	partiallyupdated: 'PartiallyUpdated',
	failedtoupdate: 'FailedToUpdate'
};

const outcomeToReason = (outcome: string): Option.Option<ProdigiErrorReason> =>
	Option.fromNullishOr(OUTCOME_REASON_MAP[outcome.toLowerCase()]);

/** Lower-cased outcomes that represent a successful API call. */
const isSuccessOutcome = Schema.is(
	Schema.Literals(['ok', 'created', 'updated', 'cancelled', 'onhold'])
);

/** HTTP status code → error reason mapping. */
const STATUS_REASON_MAP: Readonly<Record<number, ProdigiErrorReason>> = {
	400: 'ValidationFailed',
	401: 'HttpError',
	404: 'EntityNotFound',
	405: 'MethodNotAllowed',
	415: 'InvalidContentType',
	500: 'InternalServerError'
};

const mapStatusToReason = (status: number): ProdigiErrorReason =>
	STATUS_REASON_MAP[status] ?? 'HttpError';

// ---------------------------------------------------------------------------
// URL param builder
// ---------------------------------------------------------------------------

/**
 * Build URL query parameters from `GetOrdersParams`, dropping undefined
 * keys and serialising arrays as comma-separated strings.
 */
const buildOrdersUrlParams = (
	params: GetOrdersParams | undefined
): Record<string, string> | undefined => {
	if (params === undefined) return undefined;
	const entries = pipe(
		[
			serializeParam('top', params.top),
			serializeParam('skip', params.skip),
			serializeParam('createdFrom', params.createdFrom),
			serializeParam('createdTo', params.createdTo),
			serializeParam('status', params.status),
			serializeArrayParam('orderIds', params.orderIds),
			serializeArrayParam('merchantReferences', params.merchantReferences)
		],
		Arr.filterMap(
			(entry): Result.Result<readonly [string, string], void> => entry
		)
	);
	return Arr.isArrayNonEmpty(entries) ? R.fromEntries(entries) : undefined;
};

const absent: Result.Result<readonly [string, string], void> =
	Result.fail(undefined);

/** Serialise a scalar param to a key-value tuple, or skip if absent. */
const serializeParam = (
	key: string,
	value: string | number | undefined
): Result.Result<readonly [string, string], void> =>
	value !== undefined ? Result.succeed([key, String(value)]) : absent;

/** Serialise an array param as comma-separated, or skip if absent. */
const serializeArrayParam = (
	key: string,
	value: ReadonlyArray<string> | undefined
): Result.Result<readonly [string, string], void> =>
	value !== undefined ? Result.succeed([key, Arr.join(value, ',')]) : absent;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/** Prodigi API client. */
export namespace ProdigiClient {
	export interface Interface {
		// -- Orders ----------------------------------------------------------

		/** POST /v4.0/orders — Create a new order. */
		readonly createOrder: (
			input: CreateOrderInput
		) => Effect.Effect<OrderResponse, ProdigiError>;

		/** GET /v4.0/orders/:id — Get order by Prodigi order ID. */
		readonly getOrder: (
			orderId: string
		) => Effect.Effect<OrderResponse, ProdigiError>;

		/** GET /v4.0/orders — List orders with optional filters. */
		readonly getOrders: (
			params?: GetOrdersParams
		) => Effect.Effect<OrdersResponse, ProdigiError>;

		// -- Order actions ---------------------------------------------------

		/** GET /v4.0/orders/:id/actions — Get available actions. */
		readonly getActions: (
			orderId: string
		) => Effect.Effect<ActionsResponse, ProdigiError>;

		/** POST /v4.0/orders/:id/actions/cancel — Cancel an order. */
		readonly cancelOrder: (
			orderId: string
		) => Effect.Effect<CancelOrderResponse, ProdigiError>;

		/** POST /v4.0/orders/:id/actions/updateShippingMethod */
		readonly updateShippingMethod: (
			orderId: string,
			input: UpdateShippingMethodInput
		) => Effect.Effect<UpdateShippingResponse, ProdigiError>;

		/** POST /v4.0/orders/:id/actions/updateRecipient */
		readonly updateRecipient: (
			orderId: string,
			input: UpdateRecipientInput
		) => Effect.Effect<UpdateRecipientResponse, ProdigiError>;

		/** POST /v4.0/orders/:id/actions/updateMetadata */
		readonly updateMetadata: (
			orderId: string,
			input: UpdateMetadataInput
		) => Effect.Effect<UpdateMetadataResponse, ProdigiError>;

		// -- Quotes ----------------------------------------------------------

		/** POST /v4.0/quotes — Get a pricing quote. */
		readonly createQuote: (
			input: CreateQuoteInput
		) => Effect.Effect<QuoteResponse, ProdigiError>;

		// -- Products --------------------------------------------------------

		/** GET /v4.0/products/:sku — Get product details. */
		readonly getProduct: (
			sku: string
		) => Effect.Effect<ProductResponse, ProdigiError>;

		/** POST /v4.0/products/spine — Get photobook spine details. */
		readonly getSpine: (
			input: GetSpineInput
		) => Effect.Effect<SpineResponse, ProdigiError>;
	}

	/** Prodigi API client service tag. */
	export class Service extends ServiceMap.Service<Service, Interface>()(
		'@effect-prodigi/ProdigiClient'
	) {}

	/**
	 * Layer that constructs the client from `ProdigiConfig` and an
	 * `HttpClient`. Callers must provide both (e.g. via
	 * `FetchHttpClient.layer` and `ProdigiConfig.layer`).
	 */
	export const layer = Layer.effect(
		Service,
		Effect.gen(function* () {
			const config = yield* ProdigiConfig.Service;
			const rawClient = yield* HttpClient.HttpClient;

			const client = rawClient.pipe(
				HttpClient.mapRequest((req) =>
					req.pipe(
						HttpClientRequest.prependUrl(
							`${config.baseUrl}${API_VERSION}`
						),
						HttpClientRequest.setHeader(
							'X-API-Key',
							Redacted.value(config.apiKey)
						),
						HttpClientRequest.setHeader(
							'Content-Type',
							'application/json'
						),
						HttpClientRequest.acceptJson
					)
				)
			);

			// ---------------------------------------------------------------
			// Error wrapping
			// ---------------------------------------------------------------

			/**
			 * Idempotent error mapper — wraps unknown causes in
			 * `ProdigiError` without double-wrapping.
			 */
			const mapToProdigiError = <A, E, Req>(
				self: Effect.Effect<A, E, Req>
			): Effect.Effect<A, ProdigiError, Req> =>
				self.pipe(
					Effect.mapError((cause) =>
						cause instanceof ProdigiError
							? cause
							: new ProdigiError({
									reason: 'HttpError',
									message: String(cause),
									cause
								})
					)
				);

			// ---------------------------------------------------------------
			// Outcome validation
			// ---------------------------------------------------------------

			const validateOutcome = Effect.fnUntraced(function* <
				T extends WithOutcome
			>(body: T) {
				if (isSuccessOutcome(body.outcome.toLowerCase())) {
					return body;
				}
				return yield* Option.match(outcomeToReason(body.outcome), {
					onNone: () => Effect.succeed(body),
					onSome: (reason) =>
						Effect.fail(
							new ProdigiError({
								reason,
								message: `Prodigi API outcome: ${body.outcome}`
							})
						)
				});
			});

			// ---------------------------------------------------------------
			// Response handling
			// ---------------------------------------------------------------

			const handleResponse = Effect.fnUntraced(function* <
				S extends Schema.Top & { readonly Type: WithOutcome }
			>(schema: S, res: HttpClientResponse.HttpClientResponse) {
				if (res.status >= 400) {
					const errBody =
						yield* HttpClientResponse.schemaBodyJson(ErrorResponse)(
							res
						).pipe(mapToProdigiError);
					yield* Effect.logDebug('Prodigi API error response', {
						statusCode: errBody.statusCode,
						statusText: errBody.statusText
					});
					return yield* new ProdigiError({
						reason: mapStatusToReason(errBody.statusCode),
						message: errBody.statusText,
						statusCode: errBody.statusCode
					});
				}
				const body =
					yield* HttpClientResponse.schemaBodyJson(schema)(res).pipe(
						mapToProdigiError
					);
				return yield* validateOutcome(body);
			});

			// ---------------------------------------------------------------
			// Request helpers
			// ---------------------------------------------------------------

			const doGet = Effect.fnUntraced(function* <
				S extends Schema.Top & { readonly Type: WithOutcome }
			>(path: string, schema: S, urlParams?: Record<string, string>) {
				const res = yield* client
					.get(path, urlParams ? { urlParams } : undefined)
					.pipe(mapToProdigiError);
				return yield* handleResponse(schema, res);
			});

			const doPost = Effect.fnUntraced(function* <
				S extends Schema.Top & { readonly Type: WithOutcome }
			>(path: string, schema: S, body?: unknown) {
				const base = HttpClientRequest.post(path);
				const withBody =
					body !== undefined
						? base.pipe(HttpClientRequest.bodyJsonUnsafe(body))
						: base;
				const res = yield* client
					.execute(withBody)
					.pipe(mapToProdigiError);
				return yield* handleResponse(schema, res);
			});

			/**
			 * POST variant for endpoints whose response does not have an
			 * `outcome` envelope (e.g. /products/spine).
			 */
			const doPostRaw = Effect.fnUntraced(function* <
				S extends Schema.Top
			>(path: string, schema: S, body: unknown) {
				const base = HttpClientRequest.post(path);
				const withBody = base.pipe(
					HttpClientRequest.bodyJsonUnsafe(body)
				);
				const res = yield* client
					.execute(withBody)
					.pipe(mapToProdigiError);
				if (res.status >= 400) {
					return yield* new ProdigiError({
						reason: mapStatusToReason(res.status),
						message: `HTTP ${res.status}`,
						statusCode: res.status
					});
				}
				return yield* HttpClientResponse.schemaBodyJson(schema)(
					res
				).pipe(mapToProdigiError);
			});

			// ---------------------------------------------------------------
			// Endpoint implementations
			// ---------------------------------------------------------------

			const createOrder = Effect.fn('ProdigiClient.createOrder')(
				function* (input: CreateOrderInput) {
					yield* Effect.annotateCurrentSpan(
						'prodigi.idempotencyKey',
						input.idempotencyKey ?? 'none'
					);
					return yield* doPost('/orders', OrderResponse, input);
				}
			);

			const getOrder = Effect.fn('ProdigiClient.getOrder')(function* (
				orderId: string
			) {
				yield* Effect.annotateCurrentSpan('prodigi.orderId', orderId);
				return yield* doGet(`/orders/${orderId}`, OrderResponse);
			});

			const getOrders = Effect.fn('ProdigiClient.getOrders')(function* (
				params?: GetOrdersParams
			) {
				return yield* doGet(
					'/orders',
					OrdersResponse,
					buildOrdersUrlParams(params)
				);
			});

			const getActions = Effect.fn('ProdigiClient.getActions')(function* (
				orderId: string
			) {
				yield* Effect.annotateCurrentSpan('prodigi.orderId', orderId);
				return yield* doGet(
					`/orders/${orderId}/actions`,
					ActionsResponse
				);
			});

			const cancelOrder = Effect.fn('ProdigiClient.cancelOrder')(
				function* (orderId: string) {
					yield* Effect.annotateCurrentSpan(
						'prodigi.orderId',
						orderId
					);
					return yield* doPost(
						`/orders/${orderId}/actions/cancel`,
						CancelOrderResponse
					);
				}
			);

			const updateShippingMethod = Effect.fn(
				'ProdigiClient.updateShippingMethod'
			)(function* (orderId: string, input: UpdateShippingMethodInput) {
				yield* Effect.annotateCurrentSpan('prodigi.orderId', orderId);
				return yield* doPost(
					`/orders/${orderId}/actions/updateShippingMethod`,
					UpdateShippingResponse,
					input
				);
			});

			const updateRecipient = Effect.fn('ProdigiClient.updateRecipient')(
				function* (orderId: string, input: UpdateRecipientInput) {
					yield* Effect.annotateCurrentSpan(
						'prodigi.orderId',
						orderId
					);
					return yield* doPost(
						`/orders/${orderId}/actions/updateRecipient`,
						UpdateRecipientResponse,
						input
					);
				}
			);

			const updateMetadata = Effect.fn('ProdigiClient.updateMetadata')(
				function* (orderId: string, input: UpdateMetadataInput) {
					yield* Effect.annotateCurrentSpan(
						'prodigi.orderId',
						orderId
					);
					return yield* doPost(
						`/orders/${orderId}/actions/updateMetadata`,
						UpdateMetadataResponse,
						input
					);
				}
			);

			const createQuote = Effect.fn('ProdigiClient.createQuote')(
				function* (input: CreateQuoteInput) {
					return yield* doPost('/quotes', QuoteResponse, input);
				}
			);

			const getProduct = Effect.fn('ProdigiClient.getProduct')(function* (
				sku: string
			) {
				yield* Effect.annotateCurrentSpan('prodigi.sku', sku);
				return yield* doGet(`/products/${sku}`, ProductResponse);
			});

			const getSpine = Effect.fn('ProdigiClient.getSpine')(function* (
				input: GetSpineInput
			) {
				yield* Effect.annotateCurrentSpan('prodigi.sku', input.sku);
				return yield* doPostRaw(
					'/products/spine',
					SpineResponse,
					input
				);
			});

			return Service.of({
				createOrder,
				getOrder,
				getOrders,
				getActions,
				cancelOrder,
				updateShippingMethod,
				updateRecipient,
				updateMetadata,
				createQuote,
				getProduct,
				getSpine
			});
		})
	);

	/**
	 * Fully-wired default layer that reads config from the environment
	 * and uses the platform `FetchHttpClient`.
	 *
	 * **Requirements:** An `HttpClient` must still be provided by the
	 * caller (e.g. `FetchHttpClient.layer` or `BunHttpClient.layer`).
	 *
	 * **Security:** The API key is attached as a request header via
	 * `Redacted`. Ensure error reporters / loggers do not serialise
	 * raw `HttpClientRequest` headers.
	 */
	export const defaultLayer = Layer.unwrap(
		Effect.sync(() => layer.pipe(Layer.provide(ProdigiConfig.layer)))
	);
}
