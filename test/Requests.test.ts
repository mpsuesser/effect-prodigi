import { describe, expect, it } from 'vitest';
import * as Schema from 'effect/Schema';

import { CreateOrderInput, GetOrdersParams } from 'effect-prodigi';

describe('Request Schemas', () => {
	const decodeCreateOrder = Schema.decodeUnknownSync(CreateOrderInput);
	const decodeGetOrdersParams = Schema.decodeUnknownSync(GetOrdersParams);

	it('CreateOrderInput decodes a minimal valid payload', () => {
		const result = decodeCreateOrder({
			shippingMethod: 'Standard',
			recipient: {
				name: 'Jane',
				address: {
					line1: '1 Main St',
					postalOrZipCode: '12345',
					countryCode: 'US',
					townOrCity: 'Springfield'
				}
			},
			items: [
				{
					sku: 'GLOBAL-PHO-4x6',
					copies: 1,
					sizing: 'fillPrintArea',
					assets: [
						{ printArea: 'default', url: 'https://x.com/a.jpg' }
					]
				}
			]
		});
		expect(result.shippingMethod).toBe('Standard');
		expect(result.items.length).toBe(1);
	});

	it('CreateOrderInput rejects invalid shippingMethod', () => {
		expect(() =>
			decodeCreateOrder({
				shippingMethod: 'InvalidMethod',
				recipient: {
					name: 'Jane',
					address: {
						line1: '1 Main St',
						postalOrZipCode: '12345',
						countryCode: 'US',
						townOrCity: 'Springfield'
					}
				},
				items: []
			})
		).toThrow();
	});

	it('GetOrdersParams decodes with all optional fields', () => {
		const result = decodeGetOrdersParams({
			top: 10,
			skip: 5,
			createdFrom: '2025-01-01',
			createdTo: '2025-06-01',
			status: 'InProgress',
			orderIds: ['ord_1', 'ord_2'],
			merchantReferences: ['ref_a']
		});
		expect(result.top).toBe(10);
		expect(result.skip).toBe(5);
		expect(result.orderIds).toStrictEqual(['ord_1', 'ord_2']);
	});

	it('GetOrdersParams decodes an empty object', () => {
		const result = decodeGetOrdersParams({});
		expect(result).toBeDefined();
	});
});
