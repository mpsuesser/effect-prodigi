/**
 * Domain schemas for the Prodigi print-on-demand API v4.0.
 *
 * All types model the JSON shapes returned and accepted by the Prodigi REST
 * API. Nullable response fields decode to `Option` inside the domain layer;
 * request fields that are optional in the API use `Schema.optionalKey`.
 *
 * @since 0.1.0
 */
import * as Schema from 'effect/Schema';

// ---------------------------------------------------------------------------
// Primitives & enums
// ---------------------------------------------------------------------------

/** Shipping method accepted by the Prodigi API. */
export const ShippingMethod = Schema.Literals([
	'Budget',
	'Standard',
	'StandardPlus',
	'Express',
	'Overnight'
]).annotate({
	title: 'ShippingMethod',
	description:
		'Requested shipping tier: Budget, Standard, StandardPlus, Express, or Overnight.'
});

export type ShippingMethod = typeof ShippingMethod.Type;

/** Image sizing strategy. */
export const Sizing = Schema.Literals([
	'fillPrintArea',
	'fitPrintArea',
	'stretchToPrintArea'
]).annotate({
	title: 'Sizing',
	description: 'Strategy for resizing images to fit the product print area.'
});

export type Sizing = typeof Sizing.Type;

/** Order stage reported by the API. */
export const OrderStage = Schema.Literals([
	'Draft',
	'AwaitingPayment',
	'InProgress',
	'Complete',
	'Cancelled'
]).annotate({
	title: 'OrderStage',
	description: 'High-level lifecycle stage of an order.'
});

export type OrderStage = typeof OrderStage.Type;

/** Detail stage for individual order processing steps. */
export const DetailStage = Schema.Literals([
	'NotStarted',
	'InProgress',
	'Complete',
	'Error'
]).annotate({
	title: 'DetailStage',
	description: 'Status of an individual order processing step.'
});

export type DetailStage = typeof DetailStage.Type;

/** Status of an individual asset. */
export const AssetStatus = Schema.Literals([
	'InProgress',
	'Complete',
	'Error'
]).annotate({
	title: 'AssetStatus',
	description:
		'Download/processing status of an asset: InProgress, Complete, or Error.'
});

export type AssetStatus = typeof AssetStatus.Type;

/** Status of an individual order item. */
export const ItemStatus = Schema.Literals([
	'Ok',
	'Invalid',
	'NotYetDownloaded'
]).annotate({
	title: 'ItemStatus',
	description: 'Validation/download status of an order item.'
});

export type ItemStatus = typeof ItemStatus.Type;

/** Status of a shipment. */
export const ShipmentStatus = Schema.Literals([
	'Processing',
	'Cancelled',
	'Shipped'
]).annotate({
	title: 'ShipmentStatus',
	description: 'Lifecycle status of a shipment.'
});

export type ShipmentStatus = typeof ShipmentStatus.Type;

/** Charge type for billing records. */
export const ChargeType = Schema.Literals([
	'Item',
	'Shipping',
	'Refund',
	'Other'
]).annotate({
	title: 'ChargeType',
	description: 'Classification of a billing charge record.'
});

export type ChargeType = typeof ChargeType.Type;

/** Whether an order action is available. */
export const ActionAvailability = Schema.Literals(['Yes', 'No']).annotate({
	title: 'ActionAvailability',
	description: 'Whether an order action is currently available.'
});

export type ActionAvailability = typeof ActionAvailability.Type;

// ---------------------------------------------------------------------------
// Shared value objects
// ---------------------------------------------------------------------------

/** Monetary cost as reported by Prodigi. */
export class Cost extends Schema.Class<Cost>('Cost')(
	{
		amount: Schema.String,
		currency: Schema.String
	},
	{
		description:
			'A monetary amount with ISO currency code. Positive is debit, negative is credit.'
	}
) {}

/** Postal address. */
export class Address extends Schema.Class<Address>('Address')(
	{
		line1: Schema.String,
		line2: Schema.OptionFromNullOr(Schema.String),
		postalOrZipCode: Schema.String,
		countryCode: Schema.String,
		townOrCity: Schema.String,
		stateOrCounty: Schema.OptionFromNullOr(Schema.String)
	},
	{ description: 'Postal address for order recipients.' }
) {}

/** Recipient name, contact details, and address. */
export class Recipient extends Schema.Class<Recipient>('Recipient')(
	{
		name: Schema.String,
		email: Schema.OptionFromNullOr(Schema.String),
		phoneNumber: Schema.OptionFromNullOr(Schema.String),
		address: Address
	},
	{
		description:
			'Order recipient with name, optional contact info, and shipping address.'
	}
) {}

// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------

/** A single branding asset with a URL. */
export class BrandingAsset extends Schema.Class<BrandingAsset>('BrandingAsset')(
	{ url: Schema.String },
	{
		description:
			'A publicly accessible URL pointing to a print-ready branding asset.'
	}
) {}

/** Per-order branding components included in shipment packaging. */
export class Branding extends Schema.Class<Branding>('Branding')(
	{
		postcard: Schema.OptionFromNullOr(BrandingAsset),
		flyer: Schema.OptionFromNullOr(BrandingAsset),
		packing_slip_bw: Schema.OptionFromNullOr(BrandingAsset),
		packing_slip_color: Schema.OptionFromNullOr(BrandingAsset),
		sticker_exterior_round: Schema.OptionFromNullOr(BrandingAsset),
		sticker_exterior_rectangle: Schema.OptionFromNullOr(BrandingAsset),
		sticker_interior_round: Schema.OptionFromNullOr(BrandingAsset),
		sticker_interior_rectangle: Schema.OptionFromNullOr(BrandingAsset)
	},
	{
		description:
			'Branded assets (postcards, flyers, stickers, packing slips) to include in shipments.'
	}
) {}

// ---------------------------------------------------------------------------
// Assets & items
// ---------------------------------------------------------------------------

/** An image asset belonging to an order item (response shape). */
export class Asset extends Schema.Class<Asset>('Asset')(
	{
		id: Schema.String,
		printArea: Schema.String,
		md5Hash: Schema.OptionFromNullOr(Schema.String),
		url: Schema.String,
		thumbnailUrl: Schema.OptionFromNullOr(Schema.String),
		pageCount: Schema.OptionFromNullOr(Schema.Number),
		status: AssetStatus
	},
	{
		description:
			'An image asset on a product, with download/processing status.'
	}
) {}

/** Packing slip attached to an order. */
export class PackingSlip extends Schema.Class<PackingSlip>('PackingSlip')(
	{
		url: Schema.OptionFromNullOr(Schema.String),
		status: Schema.OptionFromNullOr(Schema.String)
	},
	{ description: 'Optional packing slip URL and its processing status.' }
) {}

/** An order item (response shape). */
export class Item extends Schema.Class<Item>('Item')(
	{
		id: Schema.String,
		status: ItemStatus,
		merchantReference: Schema.OptionFromNullOr(Schema.String),
		sku: Schema.String,
		copies: Schema.Number,
		sizing: Sizing,
		attributes: Schema.Record(Schema.String, Schema.Unknown),
		assets: Schema.Array(Asset),
		recipientCost: Schema.OptionFromNullOr(Cost)
	},
	{
		description:
			'A product + assets combination within an order, with fulfilment status.'
	}
) {}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/** Authorisation payment details for orders requiring payment. */
export class AuthorisationPaymentDetails extends Schema.Class<AuthorisationPaymentDetails>(
	'AuthorisationPaymentDetails'
)(
	{
		amount: Schema.String,
		currency: Schema.String
	},
	{ description: 'Payment amount and currency for order authorisation.' }
) {}

/** Authorisation details for orders requiring payment approval. */
export class AuthorisationDetails extends Schema.Class<AuthorisationDetails>(
	'AuthorisationDetails'
)(
	{
		authorisationUrl: Schema.String,
		paymentDetails: AuthorisationPaymentDetails
	},
	{
		description: 'URL and payment info for authorising payment on an order.'
	}
) {}

/** An issue/warning on an order or order item. */
export class Issue extends Schema.Class<Issue>('Issue')(
	{
		objectId: Schema.OptionFromNullOr(Schema.String),
		errorCode: Schema.String,
		description: Schema.String,
		authorisationDetails: Schema.OptionFromNullOr(AuthorisationDetails)
	},
	{ description: 'An order-level or item-level issue with error code.' }
) {}

/** Detailed processing stages within an order. */
export class StatusDetails extends Schema.Class<StatusDetails>('StatusDetails')(
	{
		downloadAssets: DetailStage,
		printReadyAssetsPrepared: DetailStage,
		allocateProductionLocation: DetailStage,
		inProduction: DetailStage,
		shipping: DetailStage
	},
	{
		description:
			'Fine-grained processing stages: download, preparation, allocation, production, shipping.'
	}
) {}

/** Overall order status including stage, details, and issues. */
export class Status extends Schema.Class<Status>('Status')(
	{
		stage: OrderStage,
		issues: Schema.Array(Issue),
		details: StatusDetails
	},
	{
		description:
			'Full order status with lifecycle stage, processing details, and any issues.'
	}
) {}

// ---------------------------------------------------------------------------
// Charges
// ---------------------------------------------------------------------------

/** An individual charge line item. */
export class ChargeItem extends Schema.Class<ChargeItem>('ChargeItem')(
	{
		id: Schema.String,
		shipmentId: Schema.OptionFromNullOr(Schema.String),
		itemId: Schema.OptionFromNullOr(Schema.String),
		cost: Cost
	},
	{ description: 'Individual charge line with optional shipment/item link.' }
) {}

/** A charge record on an order. */
export class Charge extends Schema.Class<Charge>('Charge')(
	{
		id: Schema.String,
		chargeType: ChargeType,
		prodigiInvoiceNumber: Schema.OptionFromNullOr(Schema.String),
		totalCost: Cost,
		items: Schema.Array(ChargeItem)
	},
	{ description: 'Billing charge record with type, total, and line items.' }
) {}

// ---------------------------------------------------------------------------
// Shipments
// ---------------------------------------------------------------------------

/** Carrier information for a shipment. */
export class Carrier extends Schema.Class<Carrier>('Carrier')(
	{
		name: Schema.String,
		service: Schema.String
	},
	{ description: 'Shipping carrier name and service tier.' }
) {}

/** Location from which items are fulfilled. */
export class FulfillmentLocation extends Schema.Class<FulfillmentLocation>(
	'FulfillmentLocation'
)(
	{
		countryCode: Schema.String,
		labCode: Schema.String
	},
	{
		description:
			'Two-letter ISO country code and lab code of the fulfilment site.'
	}
) {}

/** Tracking information for a shipment. */
export class Tracking extends Schema.Class<Tracking>('Tracking')(
	{
		url: Schema.OptionFromNullOr(Schema.String),
		number: Schema.OptionFromNullOr(Schema.String)
	},
	{ description: 'Tracking URL and carrier tracking number.' }
) {}

/** Item reference within a shipment. */
export class ShipmentItem extends Schema.Class<ShipmentItem>('ShipmentItem')(
	{
		itemId: Schema.String
	},
	{ description: 'Reference to an order item included in a shipment.' }
) {}

/** A shipment on an order. */
export class Shipment extends Schema.Class<Shipment>('Shipment')(
	{
		id: Schema.String,
		status: ShipmentStatus,
		carrier: Carrier,
		dispatchDate: Schema.OptionFromNullOr(Schema.String),
		items: Schema.Array(ShipmentItem),
		tracking: Schema.OptionFromNullOr(Tracking),
		fulfillmentLocation: FulfillmentLocation
	},
	{
		description:
			'A shipment with carrier, tracking, items, and fulfilment location.'
	}
) {}

// ---------------------------------------------------------------------------
// Order (response shape)
// ---------------------------------------------------------------------------

/** Full order object as returned by the Prodigi API. */
export class Order extends Schema.Class<Order>('Order')(
	{
		id: Schema.String,
		created: Schema.String,
		lastUpdated: Schema.String,
		callbackUrl: Schema.OptionFromNullOr(Schema.String),
		merchantReference: Schema.OptionFromNullOr(Schema.String),
		shippingMethod: ShippingMethod,
		idempotencyKey: Schema.OptionFromNullOr(Schema.String),
		status: Status,
		charges: Schema.Array(Charge),
		shipments: Schema.Array(Shipment),
		recipient: Recipient,
		branding: Schema.OptionFromNullOr(Branding),
		items: Schema.Array(Item),
		packingSlip: Schema.OptionFromNullOr(PackingSlip),
		metadata: Schema.OptionFromNullOr(
			Schema.Record(Schema.String, Schema.Unknown)
		)
	},
	{
		description:
			'Complete order object with status, charges, shipments, items, and metadata.'
	}
) {}

// ---------------------------------------------------------------------------
// Quote domain objects
// ---------------------------------------------------------------------------

/** Cost summary for a quote. */
export class CostSummary extends Schema.Class<CostSummary>('CostSummary')(
	{
		items: Cost,
		shipping: Cost
	},
	{ description: 'Aggregated item and shipping costs for a quote.' }
) {}

/** Asset reference within a quote item (print area only). */
export class QuoteAsset extends Schema.Class<QuoteAsset>('QuoteAsset')(
	{
		printArea: Schema.String
	},
	{ description: 'Print area reference for a quoted item asset.' }
) {}

/** A quoted item with unit cost. */
export class QuoteItem extends Schema.Class<QuoteItem>('QuoteItem')(
	{
		id: Schema.String,
		sku: Schema.String,
		copies: Schema.Number,
		unitCost: Cost,
		attributes: Schema.Record(Schema.String, Schema.Unknown),
		assets: Schema.Array(QuoteAsset)
	},
	{ description: 'A product in a quote with per-unit cost information.' }
) {}

/** Issue in a quote response. */
export class QuoteIssue extends Schema.Class<QuoteIssue>('QuoteIssue')(
	{
		errorCode: Schema.String,
		description: Schema.String
	},
	{ description: 'Warning or error associated with a quote.' }
) {}

/** A quote shipment with carrier and cost. */
export class QuoteShipment extends Schema.Class<QuoteShipment>('QuoteShipment')(
	{
		carrier: Carrier,
		fulfillmentLocation: FulfillmentLocation,
		cost: Cost,
		items: Schema.Array(Schema.String)
	},
	{
		description:
			'Expected shipment in a quote with carrier, lab, cost, and item references.'
	}
) {}

/** A single quote for a specific shipping method. */
export class Quote extends Schema.Class<Quote>('Quote')(
	{
		shipmentMethod: Schema.String,
		costSummary: CostSummary,
		shipments: Schema.Array(QuoteShipment),
		items: Schema.Array(QuoteItem),
		issues: Schema.optionalKey(Schema.Array(QuoteIssue))
	},
	{
		description:
			'Pricing and fulfilment details for a set of products at a given shipping method.'
	}
) {}

// ---------------------------------------------------------------------------
// Product details
// ---------------------------------------------------------------------------

/** Physical dimensions of a product. */
export class ProductDimensions extends Schema.Class<ProductDimensions>(
	'ProductDimensions'
)(
	{
		width: Schema.Number,
		height: Schema.Number,
		units: Schema.String
	},
	{ description: 'Width, height, and unit of measurement of a product.' }
) {}

/** Print area definition on a product. */
export class PrintArea extends Schema.Class<PrintArea>('PrintArea')(
	{
		required: Schema.Boolean
	},
	{
		description: 'Whether an asset must be supplied for this print area.'
	}
) {}

/** Recommended pixel dimensions for a print area variant. */
export class PrintAreaDimensions extends Schema.Class<PrintAreaDimensions>(
	'PrintAreaDimensions'
)(
	{
		horizontalResolution: Schema.Number,
		verticalResolution: Schema.Number
	},
	{
		description:
			'Recommended horizontal and vertical pixel sizes for a print area.'
	}
) {}

/** A product variant with specific attributes and destinations. */
export class Variant extends Schema.Class<Variant>('Variant')(
	{
		attributes: Schema.Record(Schema.String, Schema.Unknown),
		shipsTo: Schema.Array(Schema.String),
		printAreaSizes: Schema.Record(Schema.String, PrintAreaDimensions)
	},
	{
		description:
			'Product variant with attribute values, shipping destinations, and print area sizes.'
	}
) {}

/** Full product details for a SKU. */
export class Product extends Schema.Class<Product>('Product')(
	{
		sku: Schema.String,
		description: Schema.String,
		productDimensions: ProductDimensions,
		attributes: Schema.Record(Schema.String, Schema.Array(Schema.String)),
		printAreas: Schema.Record(Schema.String, PrintArea),
		variants: Schema.Array(Variant)
	},
	{
		description:
			'Full product catalogue entry with dimensions, attributes, print areas, and variants.'
	}
) {}

/** Photobook spine information. */
export class SpineInfo extends Schema.Class<SpineInfo>('SpineInfo')(
	{
		widthMm: Schema.Number
	},
	{ description: 'Required spine width in millimetres for a photobook.' }
) {}

// ---------------------------------------------------------------------------
// Callback event (CloudEvent)
// ---------------------------------------------------------------------------

/** CloudEvent callback payload from Prodigi. */
export class CallbackEvent extends Schema.Class<CallbackEvent>('CallbackEvent')(
	{
		specversion: Schema.String,
		type: Schema.String,
		source: Schema.String,
		id: Schema.String,
		time: Schema.String,
		datacontenttype: Schema.String,
		data: Schema.Record(Schema.String, Schema.Unknown),
		subject: Schema.String
	},
	{
		description:
			'CloudEvent webhook payload sent by Prodigi on order stage changes.'
	}
) {}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Availability of a single action on an order. */
export class ActionStatus extends Schema.Class<ActionStatus>('ActionStatus')(
	{
		isAvailable: ActionAvailability
	},
	{ description: 'Whether an order action is currently available.' }
) {}

/** Available actions for an order. */
export class OrderActions extends Schema.Class<OrderActions>('OrderActions')(
	{
		cancel: ActionStatus,
		changeRecipientDetails: ActionStatus,
		changeShippingMethod: ActionStatus,
		changeMetaData: ActionStatus
	},
	{ description: 'Available mutation actions for a given order.' }
) {}

// ---------------------------------------------------------------------------
// Shipment update result
// ---------------------------------------------------------------------------

/** Result of updating a single shipment. */
export class ShipmentUpdateResult extends Schema.Class<ShipmentUpdateResult>(
	'ShipmentUpdateResult'
)(
	{
		shipmentId: Schema.String,
		successful: Schema.Boolean,
		errorCode: Schema.optionalKey(Schema.String),
		description: Schema.optionalKey(Schema.String)
	},
	{ description: 'Success/failure detail for a shipment-level update.' }
) {}
