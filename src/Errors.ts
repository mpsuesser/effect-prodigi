/**
 * Error types for the Prodigi API client.
 *
 * `ProdigiError` is the single typed error emitted by all client methods. It
 * uses a `reason` literal discriminant so callers can branch with
 * `catchReason` or `Match`.
 *
 * @since 0.1.0
 */
import * as Schema from 'effect/Schema';

/**
 * Reason codes covering every documented Prodigi API outcome that
 * represents a problem or unexpected state, plus transport-level failures.
 */
export const ProdigiErrorReason = Schema.Literals([
	// --- general outcomes ---
	'ValidationFailed',
	'EntityNotFound',
	'EndpointDoesNotExist',
	'MethodNotAllowed',
	'InvalidContentType',
	'InternalServerError',
	'TimedOut',
	// --- order create outcomes ---
	'CreatedWithIssues',
	'AlreadyExists',
	// --- cancel outcomes ---
	'FailedToCancel',
	'ActionNotAvailable',
	// --- update outcomes ---
	'PartiallyUpdated',
	'FailedToUpdate',
	// --- transport / decode ---
	'HttpError',
	'DecodeError'
]).annotate({
	title: 'ProdigiErrorReason',
	description:
		'Discriminant for the kind of failure that occurred during a Prodigi API operation.'
});

export type ProdigiErrorReason = typeof ProdigiErrorReason.Type;

/**
 * Unified error type for the Prodigi client.
 *
 * Every public method on the `ProdigiClient` service fails with this error.
 * The `reason` field lets callers handle specific failure modes precisely.
 */
export class ProdigiError extends Schema.TaggedErrorClass<ProdigiError>()(
	'ProdigiError',
	{
		reason: ProdigiErrorReason,
		message: Schema.String,
		statusCode: Schema.optionalKey(Schema.Number),
		cause: Schema.optionalKey(Schema.Defect)
	},
	{
		description:
			'Typed failure from a Prodigi API operation, discriminated by reason.'
	}
) {}
