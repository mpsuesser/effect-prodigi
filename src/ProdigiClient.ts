/**
 * Prodigi API client service.
 *
 * Provides typed methods for every documented Prodigi v4.0 endpoint.
 * All methods fail with `ProdigiError` and require no runtime
 * dependencies beyond the service itself.
 *
 * @since 0.1.0
 */
import { Effect, Layer, Redacted, ServiceMap } from 'effect';
import * as Arr from 'effect/Array';
import * as Option from 'effect/Option';
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

/** Set of lower-cased outcomes that represent a successful API call. */
const SUCCESS_OUTCOMES: ReadonlySet<string> = new Set([
	'ok',
	'created',
	'updated',
	'cancelled',
	'onhold'
]);

const isSuccessOutcome = (outcome: string): boolean =>
	SUCCESS_OUTCOMES.has(outcome.toLowerCase());

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
	const entries: Array<readonly [string, string]> = [];
	if (params.top !== undefined) entries.push(['top', String(params.top)]);
	if (params.skip !== undefined) entries.push(['skip', String(params.skip)]);
	if (params.createdFrom !== undefined)
		entries.push(['createdFrom', params.createdFrom]);
	if (params.createdTo !== undefined)
		entries.push(['createdTo', params.createdTo]);
	if (params.status !== undefined) entries.push(['status', params.status]);
	if (params.orderIds !== undefined)
		entries.push(['orderIds', Arr.join(params.orderIds, ',')]);
	if (params.merchantReferences !== undefined)
		entries.push([
			'merchantReferences',
			Arr.join(params.merchantReferences, ',')
		]);
	return Arr.isArrayNonEmpty(entries)
		? Object.fromEntries(entries)
		: undefined;
};

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

			const wrapError = (cause: unknown): ProdigiError =>
				cause instanceof ProdigiError
					? cause
					: new ProdigiError({
							reason: 'HttpError',
							message: String(cause),
							cause
						});

			// ---------------------------------------------------------------
			// Outcome validation
			// ---------------------------------------------------------------

			/**
			 * Check the outcome field of a decoded response body. If the
			 * outcome maps to a known error reason, fail with `ProdigiError`.
			 */
			const validateOutcome = <T extends WithOutcome>(
				body: T
			): Effect.Effect<T, ProdigiError> => {
				if (isSuccessOutcome(body.outcome)) {
					return Effect.succeed(body);
				}
				return Option.match(outcomeToReason(body.outcome), {
					onNone: () => Effect.succeed(body),
					onSome: (reason) =>
						Effect.fail(
							new ProdigiError({
								reason,
								message: `Prodigi API outcome: ${body.outcome}`
							})
						)
				});
			};

			// ---------------------------------------------------------------
			// Response handling
			// ---------------------------------------------------------------

			/**
			 * Decode and validate an HTTP response. Non-2xx responses are
			 * decoded as `ErrorResponse` and mapped to `ProdigiError`.
			 * 2xx responses are decoded with the provided schema and then
			 * validated for failure outcomes.
			 */
			const handleResponse = <
				S extends Schema.Top & { readonly Type: WithOutcome }
			>(
				schema: S,
				res: HttpClientResponse.HttpClientResponse
			): Effect.Effect<
				S['Type'],
				ProdigiError,
				S['DecodingServices']
			> => {
				if (res.status >= 400) {
					return HttpClientResponse.schemaBodyJson(ErrorResponse)(
						res
					).pipe(
						Effect.flatMap((errBody) =>
							Effect.fail(
								new ProdigiError({
									reason: mapStatusToReason(
										errBody.statusCode
									),
									message: errBody.statusText,
									statusCode: errBody.statusCode
								})
							)
						),
						Effect.mapError(wrapError)
					);
				}
				return HttpClientResponse.schemaBodyJson(schema)(res).pipe(
					Effect.flatMap(validateOutcome),
					Effect.mapError(wrapError)
				);
			};

			// ---------------------------------------------------------------
			// Request helpers
			// ---------------------------------------------------------------

			const doGet = <
				S extends Schema.Top & { readonly Type: WithOutcome }
			>(
				path: string,
				schema: S,
				urlParams?: Record<string, string>
			): Effect.Effect<S['Type'], ProdigiError, S['DecodingServices']> =>
				client.get(path, urlParams ? { urlParams } : undefined).pipe(
					Effect.flatMap((res) => handleResponse(schema, res)),
					Effect.mapError(wrapError),
					Effect.withSpan(`ProdigiClient.GET ${path}`)
				);

			const doPost = <
				S extends Schema.Top & { readonly Type: WithOutcome }
			>(
				path: string,
				schema: S,
				body?: unknown
			): Effect.Effect<
				S['Type'],
				ProdigiError,
				S['DecodingServices']
			> => {
				const base = HttpClientRequest.post(path);
				const withBody =
					body !== undefined
						? base.pipe(HttpClientRequest.bodyJsonUnsafe(body))
						: base;
				return client.execute(withBody).pipe(
					Effect.flatMap((res) => handleResponse(schema, res)),
					Effect.mapError(wrapError),
					Effect.withSpan(`ProdigiClient.POST ${path}`)
				);
			};

			/**
			 * POST variant for endpoints whose response does not have an
			 * `outcome` envelope (e.g. /products/spine).
			 */
			const doPostRaw = <S extends Schema.Top>(
				path: string,
				schema: S,
				body: unknown
			): Effect.Effect<
				S['Type'],
				ProdigiError,
				S['DecodingServices']
			> => {
				const base = HttpClientRequest.post(path);
				const withBody = base.pipe(
					HttpClientRequest.bodyJsonUnsafe(body)
				);
				return client.execute(withBody).pipe(
					Effect.flatMap((res) => {
						if (res.status >= 400) {
							return Effect.fail(
								new ProdigiError({
									reason: mapStatusToReason(res.status),
									message: `HTTP ${res.status}`,
									statusCode: res.status
								})
							);
						}
						return HttpClientResponse.schemaBodyJson(schema)(
							res
						).pipe(Effect.mapError(wrapError));
					}),
					Effect.mapError(wrapError),
					Effect.withSpan(`ProdigiClient.POST ${path}`)
				);
			};

			// ---------------------------------------------------------------
			// Endpoint implementations
			// ---------------------------------------------------------------

			const createOrder = Effect.fn('ProdigiClient.createOrder')(
				function* (input: CreateOrderInput) {
					return yield* doPost('/Orders', OrderResponse, input);
				}
			);

			const getOrder = Effect.fn('ProdigiClient.getOrder')(function* (
				orderId: string
			) {
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
				return yield* doGet(
					`/Orders/${orderId}/actions`,
					ActionsResponse
				);
			});

			const cancelOrder = Effect.fn('ProdigiClient.cancelOrder')(
				function* (orderId: string) {
					return yield* doPost(
						`/orders/${orderId}/actions/cancel`,
						CancelOrderResponse
					);
				}
			);

			const updateShippingMethod = Effect.fn(
				'ProdigiClient.updateShippingMethod'
			)(function* (orderId: string, input: UpdateShippingMethodInput) {
				return yield* doPost(
					`/Orders/${orderId}/actions/updateShippingMethod`,
					UpdateShippingResponse,
					input
				);
			});

			const updateRecipient = Effect.fn('ProdigiClient.updateRecipient')(
				function* (orderId: string, input: UpdateRecipientInput) {
					return yield* doPost(
						`/Orders/${orderId}/actions/updateRecipient`,
						UpdateRecipientResponse,
						input
					);
				}
			);

			const updateMetadata = Effect.fn('ProdigiClient.updateMetadata')(
				function* (orderId: string, input: UpdateMetadataInput) {
					return yield* doPost(
						`/Orders/${orderId}/actions/updateMetadata`,
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
				return yield* doGet(`/products/${sku}`, ProductResponse);
			});

			const getSpine = Effect.fn('ProdigiClient.getSpine')(function* (
				input: GetSpineInput
			) {
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
	 * Requires `FetchHttpClient.layer` (or equivalent) to be provided.
	 */
	export const defaultLayer = Layer.unwrap(
		Effect.sync(() => layer.pipe(Layer.provide(ProdigiConfig.layer)))
	);
}
