import { describe, expect, it } from '@effect/vitest';
import { ConfigProvider, Effect, Layer, Redacted } from 'effect';

import { ProdigiConfig } from 'effect-prodigi';

/** Build a test layer stack with a given config provider backing ProdigiConfig. */
const makeConfigLayer = (env: Record<string, unknown>) =>
	ProdigiConfig.layer.pipe(
		Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env)))
	);

describe('ProdigiConfig', () => {
	describe('layer', () => {
		it.effect('reads API key and defaults environment to sandbox', () =>
			Effect.gen(function* () {
				const config = yield* ProdigiConfig.Service;
				expect(Redacted.value(config.apiKey)).toBe('test-key');
				expect(config.baseUrl).toBe('https://api.sandbox.prodigi.com');
			}).pipe(
				Effect.provide(makeConfigLayer({ PRODIGI_API_KEY: 'test-key' }))
			)
		);

		it.effect('reads live environment from config', () =>
			Effect.gen(function* () {
				const config = yield* ProdigiConfig.Service;
				expect(config.baseUrl).toBe('https://api.prodigi.com');
			}).pipe(
				Effect.provide(
					makeConfigLayer({
						PRODIGI_API_KEY: 'live-key',
						PRODIGI_ENVIRONMENT: 'live'
					})
				)
			)
		);

		it.effect('fails when API key is missing', () =>
			Effect.gen(function* () {
				const program = Effect.gen(function* () {
					yield* Effect.logDebug('attempting config load');
					yield* ProdigiConfig.Service;
				}).pipe(Effect.provide(makeConfigLayer({})));
				const exit = yield* Effect.exit(program);
				expect(exit._tag).toBe('Failure');
			})
		);
	});

	describe('make', () => {
		it.effect(
			'constructs config from explicit values with sandbox default',
			() =>
				Effect.gen(function* () {
					const config = yield* ProdigiConfig.Service;
					expect(Redacted.value(config.apiKey)).toBe('explicit-key');
					expect(config.baseUrl).toBe(
						'https://api.sandbox.prodigi.com'
					);
				}).pipe(
					Effect.provide(
						ProdigiConfig.make({ apiKey: 'explicit-key' })
					)
				)
		);

		it.effect('constructs config with live environment', () =>
			Effect.gen(function* () {
				const config = yield* ProdigiConfig.Service;
				expect(config.baseUrl).toBe('https://api.prodigi.com');
			}).pipe(
				Effect.provide(
					ProdigiConfig.make({
						apiKey: 'live-key',
						environment: 'live'
					})
				)
			)
		);
	});
});
