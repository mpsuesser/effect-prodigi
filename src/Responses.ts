/**
 * Response envelope schemas for the Prodigi API v4.0.
 *
 * Every Prodigi API response includes an `outcome` field and a
 * `traceParent` identifier. These schemas capture the full JSON
 * envelopes so the client can decode responses and branch on outcome.
 *
 * @since 0.1.0
 */
import * as Schema from 'effect/Schema';

import {
	ActionStatus,
	Order,
	Product,
	Quote,
	ShipmentUpdateResult,
	SpineInfo
} from './Schemas.ts';

// ---------------------------------------------------------------------------
// Single-order responses
// ---------------------------------------------------------------------------

/** Response from POST /v4.0/orders (create) and GET /v4.0/orders/:id. */
export class OrderResponse extends Schema.Class<OrderResponse>('OrderResponse')(
	{
		outcome: Schema.String,
		order: Order,
		traceParent: Schema.optionalKey(Schema.String)
	},
	{
		description:
			'API response envelope containing a single order and outcome.'
	}
) {}

// ---------------------------------------------------------------------------
// Order list response
// ---------------------------------------------------------------------------

/** Response from GET /v4.0/orders. */
export class OrdersResponse extends Schema.Class<OrdersResponse>(
	'OrdersResponse'
)(
	{
		outcome: Schema.String,
		orders: Schema.Array(Order),
		hasMore: Schema.Boolean,
		nextUrl: Schema.OptionFromNullOr(Schema.String),
		traceParent: Schema.optionalKey(Schema.String)
	},
	{
		description:
			'Paginated list of orders with hasMore/nextUrl for pagination.'
	}
) {}

// ---------------------------------------------------------------------------
// Actions response
// ---------------------------------------------------------------------------

/** Response from GET /v4.0/orders/:id/actions. */
export class ActionsResponse extends Schema.Class<ActionsResponse>(
	'ActionsResponse'
)(
	{
		outcome: Schema.String,
		cancel: Schema.optionalKey(ActionStatus),
		changeRecipientDetails: Schema.optionalKey(ActionStatus),
		changeShippingMethod: Schema.optionalKey(ActionStatus),
		changeMetaData: Schema.optionalKey(ActionStatus),
		traceParent: Schema.optionalKey(Schema.String)
	},
	{
		description: 'Available actions for a specific order.'
	}
) {}

// ---------------------------------------------------------------------------
// Cancel response
// ---------------------------------------------------------------------------

/** Response from POST /v4.0/orders/:id/actions/cancel. */
export class CancelOrderResponse extends Schema.Class<CancelOrderResponse>(
	'CancelOrderResponse'
)(
	{
		outcome: Schema.String,
		order: Order,
		traceParent: Schema.optionalKey(Schema.String)
	},
	{ description: 'Response after attempting to cancel an order.' }
) {}

// ---------------------------------------------------------------------------
// Update responses
// ---------------------------------------------------------------------------

/** Response from POST /v4.0/orders/:id/actions/updateShippingMethod. */
export class UpdateShippingResponse extends Schema.Class<UpdateShippingResponse>(
	'UpdateShippingResponse'
)(
	{
		outcome: Schema.String,
		shippingUpdateResults: Schema.optionalKey(
			Schema.Array(ShipmentUpdateResult)
		),
		shipmentUpdateResults: Schema.optionalKey(
			Schema.Array(ShipmentUpdateResult)
		),
		order: Order,
		traceParent: Schema.optionalKey(Schema.String)
	},
	{
		description: 'Response after updating the shipping method on an order.'
	}
) {}

/** Response from POST /v4.0/orders/:id/actions/updateRecipient. */
export class UpdateRecipientResponse extends Schema.Class<UpdateRecipientResponse>(
	'UpdateRecipientResponse'
)(
	{
		outcome: Schema.String,
		shipmentUpdateResults: Schema.optionalKey(
			Schema.Array(ShipmentUpdateResult)
		),
		order: Order,
		traceParent: Schema.optionalKey(Schema.String)
	},
	{
		description: 'Response after updating recipient details on an order.'
	}
) {}

/** Response from POST /v4.0/orders/:id/actions/updateMetadata. */
export class UpdateMetadataResponse extends Schema.Class<UpdateMetadataResponse>(
	'UpdateMetadataResponse'
)(
	{
		outcome: Schema.String,
		order: Order,
		traceParent: Schema.optionalKey(Schema.String)
	},
	{
		description: 'Response after replacing metadata on an order.'
	}
) {}

// ---------------------------------------------------------------------------
// Quotes response
// ---------------------------------------------------------------------------

/** Response from POST /v4.0/quotes. */
export class QuoteResponse extends Schema.Class<QuoteResponse>('QuoteResponse')(
	{
		outcome: Schema.String,
		quotes: Schema.Array(Quote),
		traceParent: Schema.optionalKey(Schema.String)
	},
	{
		description: 'Pricing and fulfilment quote for a set of products.'
	}
) {}

// ---------------------------------------------------------------------------
// Product response
// ---------------------------------------------------------------------------

/** Response from GET /v4.0/products/:sku. */
export class ProductResponse extends Schema.Class<ProductResponse>(
	'ProductResponse'
)(
	{
		outcome: Schema.String,
		product: Product,
		traceParent: Schema.optionalKey(Schema.String)
	},
	{
		description: 'Full product details for a specific SKU.'
	}
) {}

// ---------------------------------------------------------------------------
// Spine response
// ---------------------------------------------------------------------------

/** Response from POST /v4.0/products/spine. */
export class SpineResponse extends Schema.Class<SpineResponse>('SpineResponse')(
	{
		success: Schema.Boolean,
		message: Schema.String,
		spineInfo: SpineInfo
	},
	{
		description:
			'Photobook spine width for a given page count and destination.'
	}
) {}

// ---------------------------------------------------------------------------
// Error response (non-2xx)
// ---------------------------------------------------------------------------

/** A single field-level validation error from the Prodigi API. */
export class ValidationDetail extends Schema.Class<ValidationDetail>(
	'ValidationDetail'
)(
	{
		key: Schema.String,
		message: Schema.String,
		field: Schema.optionalKey(Schema.String)
	},
	{
		description:
			'A field-level validation failure returned by the Prodigi API.'
	}
) {}

/** Structured error data returned in a non-2xx Prodigi API response. */
export class ErrorData extends Schema.Class<ErrorData>('ErrorData')(
	{
		errors: Schema.optionalKey(Schema.Array(ValidationDetail)),
		traceId: Schema.optionalKey(Schema.String)
	},
	{
		description:
			'Validation errors and trace identifier from a failed Prodigi API call.'
	}
) {}

/** Base error response shape from authenticated Prodigi API requests. */
export class ErrorResponse extends Schema.Class<ErrorResponse>('ErrorResponse')(
	{
		statusText: Schema.String,
		statusCode: Schema.Number,
		data: Schema.optionalKey(ErrorData),
		traceParent: Schema.optionalKey(Schema.String)
	},
	{
		description:
			'Error envelope returned by the Prodigi API for non-2xx responses.'
	}
) {}
