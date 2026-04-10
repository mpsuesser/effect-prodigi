/**
 * Configuration for the Prodigi API client.
 *
 * Reads API key and environment from the Effect `Config` system so
 * callers can provide values via environment variables, config
 * providers, or test fixtures.
 *
 * @since 0.1.0
 */
import { Config, Context, Effect, Layer, Match, Redacted } from 'effect';
import * as Schema from 'effect/Schema';

// ---------------------------------------------------------------------------
// Environment literal
// ---------------------------------------------------------------------------

/** Prodigi API environment: sandbox for testing, live for production. */
export const ProdigiEnvironment = Schema.Literals(['sandbox', 'live']).annotate(
	{
		title: 'ProdigiEnvironment',
		description:
			'Which Prodigi environment to target: sandbox (testing) or live (production).'
	}
);

export type ProdigiEnvironment = typeof ProdigiEnvironment.Type;

/** Map environment to base URL. */
const baseUrlForEnvironment = (env: ProdigiEnvironment): string =>
	Match.value(env).pipe(
		Match.when('live', () => 'https://api.prodigi.com'),
		Match.when('sandbox', () => 'https://api.sandbox.prodigi.com'),
		Match.exhaustive
	);

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/** Configuration values required by the Prodigi client. */
export namespace ProdigiConfig {
	export interface Interface {
		/** The X-API-Key header value. */
		readonly apiKey: Redacted.Redacted<string>;
		/** Base URL derived from the environment. */
		readonly baseUrl: string;
	}

	/** Configuration service for the Prodigi API client. */
	export class Service extends Context.Service<Service, Interface>()(
		'@effect-prodigi/ProdigiConfig'
	) {}

	/**
	 * Layer that reads configuration from the Effect `Config` system.
	 *
	 * Expected config keys (environment variable form):
	 * - `PRODIGI_API_KEY` — your Prodigi API key (redacted)
	 * - `PRODIGI_ENVIRONMENT` — `sandbox` or `live` (defaults to `sandbox`)
	 */
	export const layer = Layer.effect(
		Service,
		Effect.gen(function* () {
			const apiKey = yield* Config.redacted('PRODIGI_API_KEY');
			const env = yield* Config.schema(
				ProdigiEnvironment,
				'PRODIGI_ENVIRONMENT'
			).pipe(Config.withDefault('sandbox'));

			const baseUrl = baseUrlForEnvironment(env);

			return Service.of({ apiKey, baseUrl });
		})
	);

	/**
	 * Construct a layer from explicit values without reading Config.
	 *
	 * Useful for tests and programmatic construction.
	 */
	export const make = (options: {
		readonly apiKey: string;
		readonly environment?: ProdigiEnvironment;
	}) => {
		const env = options.environment ?? 'sandbox';
		return Layer.succeed(
			Service,
			Service.of({
				apiKey: Redacted.make(options.apiKey),
				baseUrl: baseUrlForEnvironment(env)
			})
		);
	};
}
