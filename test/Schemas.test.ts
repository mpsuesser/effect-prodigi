import { describe, expect, it } from '@effect/vitest';
import { Effect } from 'effect';
import * as Arr from 'effect/Array';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Address, Cost, Order, Recipient } from 'effect-prodigi';
import {
	ActionsResponse,
	ErrorResponse,
	OrderResponse,
	OrdersResponse,
	ProductResponse,
	QuoteResponse,
	SpineResponse
} from 'effect-prodigi';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const minimalAddress = {
	line1: '14 Tottenham Court Road',
	line2: null,
	postalOrZipCode: 'W1T 1JY',
	countryCode: 'GB',
	townOrCity: 'London',
	stateOrCounty: null
};

const minimalRecipient = {
	name: 'John Doe',
	email: null,
	phoneNumber: null,
	address: minimalAddress
};

const minimalStatusDetails = {
	downloadAssets: 'NotStarted',
	printReadyAssetsPrepared: 'NotStarted',
	allocateProductionLocation: 'NotStarted',
	inProduction: 'NotStarted',
	shipping: 'NotStarted'
};

const minimalStatus = {
	stage: 'InProgress',
	issues: [],
	details: minimalStatusDetails
};

const minimalAsset = {
	id: 'ast_abc',
	printArea: 'default',
	md5Hash: null,
	url: 'https://example.com/image.png',
	thumbnailUrl: null,
	pageCount: null,
	status: 'InProgress'
};

const minimalItem = {
	id: 'item_abc',
	status: 'Ok',
	merchantReference: null,
	sku: 'GLOBAL-PHO-4x6',
	copies: 1,
	sizing: 'fillPrintArea',
	attributes: {},
	assets: [minimalAsset],
	recipientCost: null
};

const minimalOrder = {
	id: 'ord_abc',
	created: '2025-01-01T00:00:00Z',
	lastUpdated: '2025-01-01T00:00:00Z',
	callbackUrl: null,
	merchantReference: null,
	shippingMethod: 'Standard',
	idempotencyKey: null,
	status: minimalStatus,
	charges: [],
	shipments: [],
	recipient: minimalRecipient,
	branding: null,
	items: [minimalItem],
	packingSlip: null,
	metadata: null
};

// ---------------------------------------------------------------------------
// Domain schema tests
// ---------------------------------------------------------------------------

describe('Domain Schemas', () => {
	const decodeOrder = Schema.decodeUnknownEffect(Order);
	const decodeRecipient = Schema.decodeUnknownEffect(Recipient);
	const decodeAddress = Schema.decodeUnknownEffect(Address);
	const decodeCost = Schema.decodeUnknownEffect(Cost);

	it.effect('Address decodes with null optional fields as Option.none', () =>
		Effect.gen(function* () {
			const addr = yield* decodeAddress(minimalAddress);
			expect(addr.line1).toBe('14 Tottenham Court Road');
			expect(Option.isNone(addr.line2)).toBe(true);
			expect(Option.isNone(addr.stateOrCounty)).toBe(true);
			expect(addr.countryCode).toBe('GB');
		})
	);

	it.effect(
		'Address decodes with non-null optional fields as Option.some',
		() =>
			Effect.gen(function* () {
				const addr = yield* decodeAddress({
					...minimalAddress,
					line2: 'Suite 5',
					stateOrCounty: 'Greater London'
				});
				expect(Option.getOrElse(addr.line2, () => 'MISSING')).toBe(
					'Suite 5'
				);
				expect(
					Option.getOrElse(addr.stateOrCounty, () => 'MISSING')
				).toBe('Greater London');
			})
	);

	it.effect('Recipient decodes correctly', () =>
		Effect.gen(function* () {
			const r = yield* decodeRecipient(minimalRecipient);
			expect(r.name).toBe('John Doe');
			expect(Option.isNone(r.email)).toBe(true);
		})
	);

	it.effect('Cost decodes correctly', () =>
		Effect.gen(function* () {
			const c = yield* decodeCost({ amount: '9.99', currency: 'GBP' });
			expect(c.amount).toBe('9.99');
			expect(c.currency).toBe('GBP');
		})
	);

	it.effect('Order decodes a minimal payload', () =>
		Effect.gen(function* () {
			const o = yield* decodeOrder(minimalOrder);
			expect(o.id).toBe('ord_abc');
			expect(o.shippingMethod).toBe('Standard');
			expect(o.status.stage).toBe('InProgress');
			expect(o.items.length).toBe(1);
			expect(o.items[0]?.sku).toBe('GLOBAL-PHO-4x6');
			expect(Option.isNone(o.callbackUrl)).toBe(true);
			expect(Option.isNone(o.metadata)).toBe(true);
		})
	);

	it.effect('Order decodes with metadata and charges', () =>
		Effect.gen(function* () {
			const o = yield* decodeOrder({
				...minimalOrder,
				metadata: { source: 'test' },
				charges: [
					{
						id: 'chg_1',
						chargeType: 'Item',
						prodigiInvoiceNumber: null,
						totalCost: { amount: '5.00', currency: 'GBP' },
						items: [
							{
								id: 'cli_1',
								shipmentId: null,
								itemId: 'item_abc',
								cost: { amount: '5.00', currency: 'GBP' }
							}
						]
					}
				]
			});
			expect(Option.isSome(o.metadata)).toBe(true);
			expect(o.charges.length).toBe(1);
		})
	);

	it.effect('Order decodes with shipments and tracking', () =>
		Effect.gen(function* () {
			const o = yield* decodeOrder({
				...minimalOrder,
				shipments: [
					{
						id: 'shp_1',
						status: 'Shipped',
						carrier: {
							name: 'Royal Mail',
							service: 'First Class'
						},
						dispatchDate: '2025-01-05',
						items: [{ itemId: 'item_abc' }],
						tracking: {
							url: 'https://track.example.com/123',
							number: 'TRACK123'
						},
						fulfillmentLocation: {
							countryCode: 'GB',
							labCode: 'LON'
						}
					}
				]
			});
			expect(o.shipments.length).toBe(1);
			Arr.match(o.shipments, {
				onEmpty: () => expect.unreachable('expected one shipment'),
				onNonEmpty: (shipments) => {
					const shipment = Arr.headNonEmpty(shipments);
					expect(shipment.status).toBe('Shipped');
					expect(
						Option.getOrElse(shipment.dispatchDate, () => 'MISSING')
					).toBe('2025-01-05');
					expect(
						Option.flatMap(shipment.tracking, (t) => t.number)
					).toStrictEqual(Option.some('TRACK123'));
				}
			});
		})
	);
});

// ---------------------------------------------------------------------------
// Response envelope tests
// ---------------------------------------------------------------------------

describe('Response Envelopes', () => {
	const decodeOrderResponse = Schema.decodeUnknownEffect(OrderResponse);
	const decodeOrdersResponse = Schema.decodeUnknownEffect(OrdersResponse);
	const decodeActionsResponse = Schema.decodeUnknownEffect(ActionsResponse);
	const decodeQuoteResponse = Schema.decodeUnknownEffect(QuoteResponse);
	const decodeProductResponse = Schema.decodeUnknownEffect(ProductResponse);
	const decodeSpineResponse = Schema.decodeUnknownEffect(SpineResponse);
	const decodeErrorResponse = Schema.decodeUnknownEffect(ErrorResponse);

	it.effect('OrderResponse decodes', () =>
		Effect.gen(function* () {
			const resp = yield* decodeOrderResponse({
				outcome: 'Created',
				order: minimalOrder
			});
			expect(resp.outcome).toBe('Created');
			expect(resp.order.id).toBe('ord_abc');
		})
	);

	it.effect('OrdersResponse decodes a page of orders', () =>
		Effect.gen(function* () {
			const resp = yield* decodeOrdersResponse({
				outcome: 'Ok',
				orders: [minimalOrder],
				hasMore: false,
				nextUrl: null
			});
			expect(resp.orders.length).toBe(1);
			expect(resp.hasMore).toBe(false);
			expect(Option.isNone(resp.nextUrl)).toBe(true);
		})
	);

	it.effect('ActionsResponse decodes', () =>
		Effect.gen(function* () {
			const resp = yield* decodeActionsResponse({
				outcome: 'Ok',
				cancel: { isAvailable: 'Yes' },
				changeShippingMethod: { isAvailable: 'No' }
			});
			expect(resp.outcome).toBe('Ok');
		})
	);

	it.effect('QuoteResponse decodes', () =>
		Effect.gen(function* () {
			const resp = yield* decodeQuoteResponse({
				outcome: 'Ok',
				quotes: [
					{
						shipmentMethod: 'Standard',
						costSummary: {
							items: { amount: '5.00', currency: 'GBP' },
							shipping: { amount: '2.00', currency: 'GBP' }
						},
						shipments: [
							{
								carrier: {
									name: 'DPD',
									service: 'Standard'
								},
								fulfillmentLocation: {
									countryCode: 'GB',
									labCode: 'LON'
								},
								cost: {
									amount: '2.00',
									currency: 'GBP'
								},
								items: ['item_1']
							}
						],
						items: [
							{
								id: 'item_1',
								sku: 'GLOBAL-PHO-4x6',
								copies: 1,
								unitCost: {
									amount: '5.00',
									currency: 'GBP'
								},
								attributes: {},
								assets: [{ printArea: 'default' }]
							}
						]
					}
				]
			});
			expect(resp.quotes.length).toBe(1);
			expect(resp.quotes[0]?.costSummary.items.amount).toBe('5.00');
		})
	);

	it.effect('ProductResponse decodes', () =>
		Effect.gen(function* () {
			const resp = yield* decodeProductResponse({
				outcome: 'Ok',
				product: {
					sku: 'GLOBAL-PHO-4x6',
					description: '4x6 Photo Print',
					productDimensions: {
						width: 4,
						height: 6,
						units: 'in'
					},
					attributes: { finish: ['matte', 'gloss'] },
					printAreas: {
						default: { required: true }
					},
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
				}
			});
			expect(resp.product.sku).toBe('GLOBAL-PHO-4x6');
			expect(resp.product.variants.length).toBe(1);
		})
	);

	it.effect('SpineResponse decodes', () =>
		Effect.gen(function* () {
			const resp = yield* decodeSpineResponse({
				success: true,
				message: 'Spine width calculated',
				spineInfo: { widthMm: 12.5 }
			});
			expect(resp.success).toBe(true);
			expect(resp.spineInfo.widthMm).toBe(12.5);
		})
	);

	it.effect('ErrorResponse decodes', () =>
		Effect.gen(function* () {
			const resp = yield* decodeErrorResponse({
				statusText: 'Not Found',
				statusCode: 404
			});
			expect(resp.statusCode).toBe(404);
			expect(resp.statusText).toBe('Not Found');
		})
	);
});
