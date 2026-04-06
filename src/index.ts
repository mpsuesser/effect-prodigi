/**
 * effect-prodigi
 *
 * Binding for Prodigi print-on-demand API
 *
 * @since 0.1.0
 */

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export { ProdigiError, type ProdigiErrorReason } from './Errors.ts';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
export { ProdigiConfig, type ProdigiEnvironment } from './ProdigiConfig.ts';

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
export { ProdigiClient } from './ProdigiClient.ts';

// ---------------------------------------------------------------------------
// Domain schemas (response shapes)
// ---------------------------------------------------------------------------
export {
	ActionAvailability,
	ActionStatus,
	Address,
	Asset,
	AssetStatus,
	AuthorisationDetails,
	AuthorisationPaymentDetails,
	Branding,
	BrandingAsset,
	CallbackEvent,
	Carrier,
	Charge,
	ChargeItem,
	ChargeType,
	Cost,
	CostSummary,
	decodeCallbackEvent,
	DetailStage,
	FulfillmentLocation,
	isCallbackEvent,
	Issue,
	Item,
	ItemStatus,
	Order,
	OrderActions,
	OrderStage,
	PackingSlip,
	PrintArea,
	PrintAreaDimensions,
	Product,
	ProductDimensions,
	Quote,
	QuoteAsset,
	QuoteIssue,
	QuoteItem,
	QuoteShipment,
	Recipient,
	Shipment,
	ShipmentItem,
	ShipmentStatus,
	ShipmentUpdateResult,
	ShippingMethod,
	Sizing,
	SpineInfo,
	Status,
	StatusDetails,
	Tracking,
	Variant
} from './Schemas.ts';

// ---------------------------------------------------------------------------
// Request schemas (input shapes)
// ---------------------------------------------------------------------------
export {
	AddressInput,
	BrandingAssetInput,
	BrandingInput,
	CreateAssetInput,
	CreateItemInput,
	CreateOrderInput,
	CreateQuoteInput,
	GetOrdersParams,
	GetSpineInput,
	PackingSlipInput,
	QuoteAssetInput,
	QuoteItemInput,
	RecipientCostInput,
	RecipientInput,
	UpdateAddressInput,
	UpdateMetadataInput,
	UpdateRecipientInput,
	UpdateShippingMethodInput
} from './Requests.ts';

// ---------------------------------------------------------------------------
// Response schemas (envelope shapes)
// ---------------------------------------------------------------------------
export {
	ActionsResponse,
	CancelOrderResponse,
	ErrorData,
	ErrorResponse,
	OrderResponse,
	OrdersResponse,
	ProductResponse,
	QuoteResponse,
	SpineResponse,
	UpdateMetadataResponse,
	UpdateRecipientResponse,
	UpdateShippingResponse,
	ValidationDetail
} from './Responses.ts';
