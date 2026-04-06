import { describe, expect, it } from '@effect/vitest';
import { Effect } from 'effect';

import { ProdigiError } from 'effect-prodigi';

describe('ProdigiError', () => {
	it('constructs with required fields', () => {
		const error = new ProdigiError({
			reason: 'HttpError',
			message: 'Connection refused'
		});
		expect(error._tag).toBe('ProdigiError');
		expect(error.reason).toBe('HttpError');
		expect(error.message).toBe('Connection refused');
	});

	it('constructs with optional statusCode and cause', () => {
		const cause = new Error('underlying');
		const error = new ProdigiError({
			reason: 'InternalServerError',
			message: 'Server error',
			statusCode: 500,
			cause
		});
		expect(error.statusCode).toBe(500);
		expect(error.cause).toBe(cause);
	});

	it.effect('is catchable via catchTag', () =>
		Effect.gen(function* () {
			const result = yield* Effect.fail(
				new ProdigiError({
					reason: 'EntityNotFound',
					message: 'Not found'
				})
			).pipe(
				Effect.catchTag('ProdigiError', (e) => Effect.succeed(e.reason))
			);
			expect(result).toBe('EntityNotFound');
		})
	);

	it.effect('is yieldable as a direct error', () =>
		Effect.gen(function* () {
			const program = Effect.gen(function* () {
				yield* Effect.logDebug('about to yield error');
				return yield* new ProdigiError({
					reason: 'TimedOut',
					message: 'Request timed out'
				});
			});
			const error = yield* Effect.flip(program);
			expect(error).toBeInstanceOf(ProdigiError);
			expect(error.reason).toBe('TimedOut');
		})
	);
});
