/**
 * Request body schemas for the Prodigi API v4.0.
 *
 * These model the JSON payloads *sent* to the API. Optional fields
 * that the API does not require use `Schema.optionalKey`.
 *
 * @since 0.1.0
 */
import * as Schema from 'effect/Schema';

import { ShippingMethod, Sizing } from './Schemas.ts';

// ---------------------------------------------------------------------------
// Order creation
// ---------------------------------------------------------------------------

/** Asset supplied when creating an order item. */
export class CreateAssetInput extends Schema.Class<CreateAssetInput>(
	'CreateAssetInput'
)(
	{
		printArea: Schema.String,
		url: Schema.String,
		md5Hash: Schema.optionalKey(Schema.String),
		pageCount: Schema.optionalKey(Schema.Number)
	},
	{
		description:
			'Image asset reference for an order item, with optional hash and page count.'
	}
) {}

/** Cost the merchant charged the recipient (for customs). */
export class RecipientCostInput extends Schema.Class<RecipientCostInput>(
	'RecipientCostInput'
)(
	{
		amount: Schema.String,
		currency: Schema.String
	},
	{
		description:
			'Price charged to the recipient, used for customs declarations.'
	}
) {}

/** A branding asset URL for order creation. */
export class BrandingAssetInput extends Schema.Class<BrandingAssetInput>(
	'BrandingAssetInput'
)(
	{ url: Schema.String },
	{ description: 'URL of a print-ready branding asset.' }
) {}

/** Branding components for order creation. */
export class BrandingInput extends Schema.Class<BrandingInput>('BrandingInput')(
	{
		postcard: Schema.optionalKey(BrandingAssetInput),
		flyer: Schema.optionalKey(BrandingAssetInput),
		packing_slip_bw: Schema.optionalKey(BrandingAssetInput),
		packing_slip_color: Schema.optionalKey(BrandingAssetInput),
		sticker_exterior_round: Schema.optionalKey(BrandingAssetInput),
		sticker_exterior_rectangle: Schema.optionalKey(BrandingAssetInput),
		sticker_interior_round: Schema.optionalKey(BrandingAssetInput),
		sticker_interior_rectangle: Schema.optionalKey(BrandingAssetInput)
	},
	{
		description: 'Branding assets to include in shipment packaging.'
	}
) {}

/** An item in the order creation request. */
export class CreateItemInput extends Schema.Class<CreateItemInput>(
	'CreateItemInput'
)(
	{
		merchantReference: Schema.optionalKey(Schema.String),
		sku: Schema.String,
		copies: Schema.Number,
		sizing: Sizing,
		attributes: Schema.optionalKey(
			Schema.Record(Schema.String, Schema.Unknown)
		),
		recipientCost: Schema.optionalKey(RecipientCostInput),
		assets: Schema.Array(CreateAssetInput)
	},
	{
		description: 'Product + assets combination to include in an order.'
	}
) {}

/** Address for order creation. */
export class AddressInput extends Schema.Class<AddressInput>('AddressInput')(
	{
		line1: Schema.String,
		line2: Schema.optionalKey(Schema.NullOr(Schema.String)),
		postalOrZipCode: Schema.String,
		countryCode: Schema.String,
		townOrCity: Schema.String,
		stateOrCounty: Schema.optionalKey(Schema.NullOr(Schema.String))
	},
	{ description: 'Postal address for the order recipient.' }
) {}

/**
 * Recipient for order creation (request shape).
 *
 * Optional fields use `optionalKey` since absent keys are omitted from
 * the JSON payload. For the response-side counterpart where nullable
 * fields decode to `Option`, see `Recipient` in `Schemas.ts`.
 */
export class RecipientInput extends Schema.Class<RecipientInput>(
	'RecipientInput'
)(
	{
		name: Schema.String,
		email: Schema.optionalKey(Schema.String),
		phoneNumber: Schema.optionalKey(Schema.String),
		address: AddressInput
	},
	{
		description:
			'Recipient name, optional contact details, and shipping address.'
	}
) {}

/** Packing slip for order creation. */
export class PackingSlipInput extends Schema.Class<PackingSlipInput>(
	'PackingSlipInput'
)(
	{ url: Schema.String },
	{ description: 'URL of a packing slip file to include in the order.' }
) {}

/** Full request body for POST /v4.0/orders. */
export class CreateOrderInput extends Schema.Class<CreateOrderInput>(
	'CreateOrderInput'
)(
	{
		shippingMethod: ShippingMethod,
		recipient: RecipientInput,
		items: Schema.Array(CreateItemInput),
		merchantReference: Schema.optionalKey(Schema.String),
		callbackUrl: Schema.optionalKey(Schema.String),
		idempotencyKey: Schema.optionalKey(Schema.String),
		branding: Schema.optionalKey(BrandingInput),
		packingSlip: Schema.optionalKey(PackingSlipInput),
		metadata: Schema.optionalKey(
			Schema.Record(Schema.String, Schema.Unknown)
		)
	},
	{
		description: 'Payload for creating an order in the Prodigi API.'
	}
) {}

// ---------------------------------------------------------------------------
// Order list query
// ---------------------------------------------------------------------------

/** Query parameters for GET /v4.0/orders. */
export class GetOrdersParams extends Schema.Class<GetOrdersParams>(
	'GetOrdersParams'
)(
	{
		top: Schema.optionalKey(Schema.Number),
		skip: Schema.optionalKey(Schema.Number),
		createdFrom: Schema.optionalKey(Schema.String),
		createdTo: Schema.optionalKey(Schema.String),
		status: Schema.optionalKey(Schema.String),
		orderIds: Schema.optionalKey(Schema.Array(Schema.String)),
		merchantReferences: Schema.optionalKey(Schema.Array(Schema.String))
	},
	{ description: 'Filtering/pagination options for listing orders.' }
) {}

// ---------------------------------------------------------------------------
// Order actions
// ---------------------------------------------------------------------------

/** Request body for POST /v4.0/orders/:id/actions/updateShippingMethod. */
export class UpdateShippingMethodInput extends Schema.Class<UpdateShippingMethodInput>(
	'UpdateShippingMethodInput'
)(
	{
		shippingMethod: ShippingMethod
	},
	{ description: 'New shipping method for an order.' }
) {}

/** Recipient address for update (all fields required per API spec). */
export class UpdateAddressInput extends Schema.Class<UpdateAddressInput>(
	'UpdateAddressInput'
)(
	{
		line1: Schema.String,
		line2: Schema.String,
		postalOrZipCode: Schema.String,
		countryCode: Schema.String,
		townOrCity: Schema.String,
		stateOrCounty: Schema.String
	},
	{
		description:
			'Full recipient address for the update recipient action (all fields required).'
	}
) {}

/** Request body for POST /v4.0/orders/:id/actions/updateRecipient. */
export class UpdateRecipientInput extends Schema.Class<UpdateRecipientInput>(
	'UpdateRecipientInput'
)(
	{
		name: Schema.String,
		email: Schema.String,
		phoneNumber: Schema.String,
		address: UpdateAddressInput
	},
	{
		description:
			'Updated recipient details for an existing order (all fields required).'
	}
) {}

/** Request body for POST /v4.0/orders/:id/actions/updateMetadata. */
export class UpdateMetadataInput extends Schema.Class<UpdateMetadataInput>(
	'UpdateMetadataInput'
)(
	{
		metadata: Schema.Record(Schema.String, Schema.Unknown)
	},
	{ description: 'Replacement metadata object for an order.' }
) {}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

/** Asset reference for a quote request. */
export class QuoteAssetInput extends Schema.Class<QuoteAssetInput>(
	'QuoteAssetInput'
)(
	{ printArea: Schema.String },
	{ description: 'Print area reference for a quoted item.' }
) {}

/** Item in a quote request. */
export class QuoteItemInput extends Schema.Class<QuoteItemInput>(
	'QuoteItemInput'
)(
	{
		sku: Schema.String,
		copies: Schema.Number,
		attributes: Schema.optionalKey(
			Schema.Record(Schema.String, Schema.Unknown)
		),
		assets: Schema.Array(QuoteAssetInput)
	},
	{ description: 'Product to include in a quote.' }
) {}

/** Request body for POST /v4.0/quotes. */
export class CreateQuoteInput extends Schema.Class<CreateQuoteInput>(
	'CreateQuoteInput'
)(
	{
		destinationCountryCode: Schema.String,
		items: Schema.Array(QuoteItemInput),
		shippingMethod: Schema.optionalKey(ShippingMethod),
		currencyCode: Schema.optionalKey(Schema.String)
	},
	{
		description:
			'Payload for creating a pricing quote without placing an order.'
	}
) {}

// ---------------------------------------------------------------------------
// Product spine
// ---------------------------------------------------------------------------

/** Request body for POST /v4.0/products/spine. */
export class GetSpineInput extends Schema.Class<GetSpineInput>('GetSpineInput')(
	{
		sku: Schema.String,
		destinationCountryCode: Schema.String,
		state: Schema.optionalKey(Schema.String),
		numberOfPages: Schema.Number
	},
	{
		description:
			'Parameters for retrieving photobook spine width information.'
	}
) {}
