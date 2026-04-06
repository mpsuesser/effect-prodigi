/// <reference types="bun-types" />
import { describe, expect, it } from '@effect/vitest';
import { Effect, Layer, pipe } from 'effect';
import * as Arr from 'effect/Array';
import * as Option from 'effect/Option';
import { HttpClient, HttpClientResponse } from 'effect/unstable/http';

import { ProdigiClient, ProdigiConfig, ProdigiError } from 'effect-prodigi';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const minimalOrder = {
	id: 'ord_abc123',
	created: '2025-01-01T00:00:00Z',
	lastUpdated: '2025-01-01T00:00:00Z',
	callbackUrl: null,
	merchantReference: 'ref-001',
	shippingMethod: 'Standard',
	idempotencyKey: null,
	status: {
		stage: 'InProgress',
		issues: [],
		details: {
			downloadAssets: 'Complete',
			printReadyAssetsPrepared: 'InProgress',
			allocateProductionLocation: 'NotStarted',
			inProduction: 'NotStarted',
			shipping: 'NotStarted'
		}
	},
	charges: [],
	shipments: [],
	recipient: {
		name: 'Jane Smith',
		email: null,
		phoneNumber: null,
		address: {
			line1: '10 Downing Street',
			line2: null,
			postalOrZipCode: 'SW1A 2AA',
			countryCode: 'GB',
			townOrCity: 'London',
			stateOrCounty: null
		}
	},
	branding: null,
	items: [
		{
			id: 'item_xyz',
			status: 'Ok',
			merchantReference: null,
			sku: 'GLOBAL-PHO-4x6',
			copies: 1,
			sizing: 'fillPrintArea',
			attributes: {},
			assets: [
				{
					id: 'ast_1',
					printArea: 'default',
					md5Hash: null,
					url: 'https://example.com/photo.jpg',
					thumbnailUrl: null,
					pageCount: null,
					status: 'Complete'
				}
			],
			recipientCost: null
		}
	],
	packingSlip: null,
	metadata: null
};

const minimalProduct = {
	sku: 'GLOBAL-PHO-4x6',
	description: '4x6 Photo Print',
	productDimensions: { width: 4, height: 6, units: 'in' },
	attributes: { finish: ['matte', 'gloss'] },
	printAreas: { default: { required: true } },
	variants: [
		{
			attributes: { finish: 'matte' },
			shipsTo: ['GB', 'US'],
			printAreaSizes: {
				default: {
					horizontalResolution: 1800,
					verticalResolution: 1200
				}
			}
		}
	]
};

// ---------------------------------------------------------------------------
// Mock HTTP client
// ---------------------------------------------------------------------------

/** Route definition for the mock HTTP client. */
interface MockRoute {
	readonly method: string;
	readonly pathIncludes: string;
	readonly status: number;
	readonly body: unknown;
}

/** Build a web `Response` with a JSON body. */
const jsonResponse = (body: unknown, status: number): Response =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});

/** Construct a mock `HttpClientResponse` from a route match. */
const routeToResponse = (
	request: Parameters<Parameters<typeof HttpClient.make>[0]>[0],
	route: MockRoute
) =>
	Effect.succeed(
		HttpClientResponse.fromWeb(
			request,
			jsonResponse(route.body, route.status)
		)
	);

/** Default 404 response for unmatched routes. */
const notFoundResponse = (
	request: Parameters<Parameters<typeof HttpClient.make>[0]>[0]
) =>
	Effect.succeed(
		HttpClientResponse.fromWeb(
			request,
			jsonResponse({ statusText: 'Not Found', statusCode: 404 }, 404)
		)
	);

/**
 * Build a mock `HttpClient` that routes requests based on URL path
 * and returns predefined JSON responses.
 */
const makeMockClient = (routes: ReadonlyArray<MockRoute>) =>
	HttpClient.make((request, url) =>
		pipe(
			routes,
			Arr.findFirst(
				(route: MockRoute) =>
					route.method === request.method &&
					url.pathname.includes(route.pathIncludes)
			),
			Option.match({
				onNone: () => notFoundResponse(request),
				onSome: (route) => routeToResponse(request, route)
			})
		)
	);

/** Test config layer that targets a dummy base URL (the mock intercepts). */
const TestConfig = ProdigiConfig.make({ apiKey: 'test-api-key-123' });

/**
 * Build a test layer stack: MockHttpClient → ProdigiConfig → ProdigiClient.
 */
const makeTestLayer = (...routes: ReadonlyArray<MockRoute>) =>
	ProdigiClient.layer.pipe(
		Layer.provide(TestConfig),
		Layer.provide(
			Layer.succeed(HttpClient.HttpClient, makeMockClient(routes))
		)
	);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProdigiClient', () => {
	// -- getOrder -----------------------------------------------------------

	describe('getOrder', () => {
		it.effect('returns decoded OrderResponse on success', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const resp = yield* client.getOrder('ord_abc123');
				expect(resp.outcome).toBe('Ok');
				expect(resp.order.id).toBe('ord_abc123');
				expect(resp.order.recipient.name).toBe('Jane Smith');
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'GET',
						pathIncludes: '/orders/ord_abc123',
						status: 200,
						body: { outcome: 'Ok', order: minimalOrder }
					})
				)
			)
		);

		it.effect('fails with EntityNotFound on 404', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const error = yield* Effect.flip(
					client.getOrder('ord_nonexistent')
				);
				expect(error).toBeInstanceOf(ProdigiError);
				expect(error.reason).toBe('EntityNotFound');
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'GET',
						pathIncludes: '/orders/ord_nonexistent',
						status: 404,
						body: {
							statusText: 'Not Found',
							statusCode: 404
						}
					})
				)
			)
		);
	});

	// -- getOrders ----------------------------------------------------------

	describe('getOrders', () => {
		it.effect('returns paginated OrdersResponse', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const resp = yield* client.getOrders();
				expect(resp.outcome).toBe('Ok');
				expect(resp.orders.length).toBe(1);
				expect(resp.hasMore).toBe(false);
				expect(Option.isNone(resp.nextUrl)).toBe(true);
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'GET',
						pathIncludes: '/orders',
						status: 200,
						body: {
							outcome: 'Ok',
							orders: [minimalOrder],
							hasMore: false,
							nextUrl: null
						}
					})
				)
			)
		);
	});

	// -- createOrder --------------------------------------------------------

	describe('createOrder', () => {
		it.effect('returns OrderResponse on Created outcome', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const resp = yield* client.createOrder({
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
				expect(resp.outcome).toBe('Created');
				expect(resp.order.id).toBe('ord_abc123');
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'POST',
						pathIncludes: '/Orders',
						status: 200,
						body: {
							outcome: 'Created',
							order: minimalOrder
						}
					})
				)
			)
		);

		it.effect('fails with CreatedWithIssues on that outcome', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const error = yield* Effect.flip(
					client.createOrder({
						shippingMethod: 'Standard',
						recipient: {
							name: 'Test',
							address: {
								line1: '1 Test St',
								postalOrZipCode: '12345',
								countryCode: 'US',
								townOrCity: 'Testville'
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
										url: 'https://example.com/x.jpg'
									}
								]
							}
						]
					})
				);
				expect(error).toBeInstanceOf(ProdigiError);
				expect(error.reason).toBe('CreatedWithIssues');
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'POST',
						pathIncludes: '/Orders',
						status: 200,
						body: {
							outcome: 'CreatedWithIssues',
							order: minimalOrder
						}
					})
				)
			)
		);
	});

	// -- cancelOrder --------------------------------------------------------

	describe('cancelOrder', () => {
		it.effect('returns CancelOrderResponse on success', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const resp = yield* client.cancelOrder('ord_abc123');
				expect(resp.outcome).toBe('Cancelled');
				expect(resp.order.id).toBe('ord_abc123');
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'POST',
						pathIncludes: '/actions/cancel',
						status: 200,
						body: {
							outcome: 'Cancelled',
							order: minimalOrder
						}
					})
				)
			)
		);

		it.effect('fails with FailedToCancel on that outcome', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const error = yield* Effect.flip(
					client.cancelOrder('ord_abc123')
				);
				expect(error).toBeInstanceOf(ProdigiError);
				expect(error.reason).toBe('FailedToCancel');
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'POST',
						pathIncludes: '/actions/cancel',
						status: 200,
						body: {
							outcome: 'FailedToCancel',
							order: minimalOrder
						}
					})
				)
			)
		);
	});

	// -- getActions ---------------------------------------------------------

	describe('getActions', () => {
		it.effect('returns ActionsResponse', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const resp = yield* client.getActions('ord_abc123');
				expect(resp.outcome).toBe('Ok');
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'GET',
						pathIncludes: '/actions',
						status: 200,
						body: {
							outcome: 'Ok',
							cancel: { isAvailable: 'Yes' },
							changeRecipientDetails: {
								isAvailable: 'Yes'
							},
							changeShippingMethod: {
								isAvailable: 'No'
							},
							changeMetaData: { isAvailable: 'Yes' }
						}
					})
				)
			)
		);
	});

	// -- createQuote -------------------------------------------------------

	describe('createQuote', () => {
		it.effect('returns QuoteResponse', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const resp = yield* client.createQuote({
					destinationCountryCode: 'GB',
					items: [
						{
							sku: 'GLOBAL-PHO-4x6',
							copies: 1,
							assets: [{ printArea: 'default' }]
						}
					]
				});
				expect(resp.outcome).toBe('Ok');
				expect(resp.quotes.length).toBe(1);
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'POST',
						pathIncludes: '/quotes',
						status: 200,
						body: {
							outcome: 'Ok',
							quotes: [
								{
									shipmentMethod: 'Standard',
									costSummary: {
										items: {
											amount: '5.00',
											currency: 'GBP'
										},
										shipping: {
											amount: '2.00',
											currency: 'GBP'
										}
									},
									shipments: [],
									items: []
								}
							]
						}
					})
				)
			)
		);
	});

	// -- getProduct --------------------------------------------------------

	describe('getProduct', () => {
		it.effect('returns ProductResponse', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const resp = yield* client.getProduct('GLOBAL-PHO-4x6');
				expect(resp.outcome).toBe('Ok');
				expect(resp.product.sku).toBe('GLOBAL-PHO-4x6');
				expect(resp.product.variants.length).toBe(1);
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'GET',
						pathIncludes: '/products/GLOBAL-PHO-4x6',
						status: 200,
						body: {
							outcome: 'Ok',
							product: minimalProduct
						}
					})
				)
			)
		);
	});

	// -- getSpine ----------------------------------------------------------

	describe('getSpine', () => {
		it.effect('returns SpineResponse (no outcome envelope)', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const resp = yield* client.getSpine({
					sku: 'GLOBAL-BKS-HB-SM',
					destinationCountryCode: 'GB',
					numberOfPages: 40
				});
				expect(resp.success).toBe(true);
				expect(resp.spineInfo.widthMm).toBe(8.5);
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'POST',
						pathIncludes: '/products/spine',
						status: 200,
						body: {
							success: true,
							message: 'Spine calculated',
							spineInfo: { widthMm: 8.5 }
						}
					})
				)
			)
		);
	});

	// -- HTTP error handling -----------------------------------------------

	describe('HTTP error handling', () => {
		it.effect('maps 400 to ValidationFailed', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const error = yield* Effect.flip(client.getOrder('ord_bad'));
				expect(error).toBeInstanceOf(ProdigiError);
				expect(error.reason).toBe('ValidationFailed');
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'GET',
						pathIncludes: '/orders/ord_bad',
						status: 400,
						body: {
							statusText: 'Bad Request',
							statusCode: 400
						}
					})
				)
			)
		);

		it.effect('maps 401 to HttpError', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const error = yield* Effect.flip(client.getOrder('ord_auth'));
				expect(error).toBeInstanceOf(ProdigiError);
				expect(error.reason).toBe('HttpError');
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'GET',
						pathIncludes: '/orders/ord_auth',
						status: 401,
						body: {
							statusText: 'Unauthorized',
							statusCode: 401
						}
					})
				)
			)
		);

		it.effect('maps 500 to InternalServerError', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const error = yield* Effect.flip(client.getOrder('ord_500'));
				expect(error).toBeInstanceOf(ProdigiError);
				expect(error.reason).toBe('InternalServerError');
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'GET',
						pathIncludes: '/orders/ord_500',
						status: 500,
						body: {
							statusText: 'Internal Server Error',
							statusCode: 500
						}
					})
				)
			)
		);
	});

	// -- updateShippingMethod ----------------------------------------------

	describe('updateShippingMethod', () => {
		it.effect('returns UpdateShippingResponse on success', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const resp = yield* client.updateShippingMethod('ord_abc123', {
					shippingMethod: 'Express'
				});
				expect(resp.outcome).toBe('Updated');
				expect(resp.order.id).toBe('ord_abc123');
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'POST',
						pathIncludes: '/actions/updateShippingMethod',
						status: 200,
						body: {
							outcome: 'Updated',
							order: minimalOrder
						}
					})
				)
			)
		);
	});

	// -- updateRecipient ---------------------------------------------------

	describe('updateRecipient', () => {
		it.effect('returns UpdateRecipientResponse on success', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const resp = yield* client.updateRecipient('ord_abc123', {
					name: 'Updated Name',
					email: 'test@example.com',
					phoneNumber: '+44123456789',
					address: {
						line1: '1 New Street',
						line2: '',
						postalOrZipCode: 'EC1A 1BB',
						countryCode: 'GB',
						townOrCity: 'London',
						stateOrCounty: ''
					}
				});
				expect(resp.outcome).toBe('Updated');
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'POST',
						pathIncludes: '/actions/updateRecipient',
						status: 200,
						body: {
							outcome: 'Updated',
							order: minimalOrder
						}
					})
				)
			)
		);
	});

	// -- updateMetadata ----------------------------------------------------

	describe('updateMetadata', () => {
		it.effect('returns UpdateMetadataResponse on success', () =>
			Effect.gen(function* () {
				const client = yield* ProdigiClient.Service;
				const resp = yield* client.updateMetadata('ord_abc123', {
					metadata: { source: 'test', version: '2' }
				});
				expect(resp.outcome).toBe('Ok');
			}).pipe(
				Effect.provide(
					makeTestLayer({
						method: 'POST',
						pathIncludes: '/actions/updateMetadata',
						status: 200,
						body: {
							outcome: 'Ok',
							order: minimalOrder
						}
					})
				)
			)
		);
	});
});
