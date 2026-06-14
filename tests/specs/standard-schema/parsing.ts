import { describe, test, expect } from 'manten';
import * as z from 'zod';
import * as v from 'valibot';
import { typeFlag, getFlag } from '#type-flag';

describe('parsing', () => {
	describe('Zod', () => {
		test('enum returns the matched value', () => {
			const parsed = typeFlag({
				size: z.enum(['small', 'medium', 'large']),
			}, ['--size', 'medium']);

			expect(parsed.flags.size).toBe('medium');
		});

		test('enum rejects an invalid value', () => {
			let thrown: unknown;
			try {
				typeFlag({
					size: z.enum(['small', 'medium', 'large']),
				}, ['--size', 'huge']);
			} catch (error) {
				thrown = error;
			}

			// type-flag wraps the thrown message with the flag-name context
			expect(thrown).toBeInstanceOf(TypeError);
			expect((thrown as TypeError).message).toMatch('Flag "--size":');
			expect((thrown as TypeError).message).toMatch('Invalid option');

			// the original schema error is preserved on `.cause`
			expect((thrown as TypeError).cause).toBeInstanceOf(Error);
			expect(((thrown as TypeError).cause as Error).message).toMatch('Invalid option');
		});

		test('coerced number validates the range', () => {
			const parsed = typeFlag({
				port: z.coerce.number().int().min(1).max(65_535),
			}, ['--port', '8080']);

			expect(parsed.flags.port).toBe(8080);
		});

		test('coerced number rejects out-of-range values', () => {
			expect(() => {
				typeFlag({
					port: z.coerce.number().int().min(1).max(65_535),
				}, ['--port', '99999']);
			}).toThrow('Flag "--port": Too big');
		});

		test('non-coerced number rejects a string value', () => {
			// The CLI value is always a string, so a plain number schema rejects it
			expect(() => {
				typeFlag({
					port: z.number(),
				}, ['--port', '3000']);
			}).toThrow('Flag "--port":');
		});

		test('transform maps the value', () => {
			const parsed = typeFlag({
				list: z.string().transform(value => value.split(',')),
			}, ['--list', 'a,b,c']);

			expect(parsed.flags.list).toStrictEqual(['a', 'b', 'c']);
		});

		test('repeated flag collects and validates each element', () => {
			const parsed = typeFlag({
				tag: [z.enum(['debug', 'info', 'warn'])],
			}, ['--tag', 'debug', '--tag', 'warn']);

			expect(parsed.flags.tag).toStrictEqual(['debug', 'warn']);
		});

		test('repeated flag rejects an invalid element', () => {
			expect(() => {
				typeFlag({
					tag: [z.enum(['debug', 'info', 'warn'])],
				}, ['--tag', 'debug', '--tag', 'nope']);
			}).toThrow('Flag "--tag": Invalid option');
		});

		test('type-flag default applies when the flag is absent', () => {
			const parsed = typeFlag({
				size: {
					type: z.enum(['small', 'large']),
					default: 'small',
				},
			}, []);

			expect(parsed.flags.size).toBe('small');
		});
	});

	// Proves the adapter is library-agnostic, not coupled to Zod
	describe('Valibot', () => {
		test('picklist returns the matched value', () => {
			const parsed = typeFlag({
				mode: v.picklist(['dev', 'prod']),
			}, ['--mode', 'dev']);

			expect(parsed.flags.mode).toBe('dev');
		});

		test('picklist rejects an invalid value', () => {
			expect(() => {
				typeFlag({
					mode: v.picklist(['dev', 'prod']),
				}, ['--mode', 'staging']);
			}).toThrow('Flag "--mode": Invalid type');
		});

		test('email validates the string', () => {
			const parsed = typeFlag({
				email: v.pipe(v.string(), v.email()),
			}, ['--email', 'user@example.com']);

			expect(parsed.flags.email).toBe('user@example.com');
		});

		test('email rejects an invalid string', () => {
			expect(() => {
				typeFlag({
					email: v.pipe(v.string(), v.email()),
				}, ['--email', 'not-an-email']);
			}).toThrow('Flag "--email": Invalid email');
		});
	});

	describe('getFlag', () => {
		test('parses and validates with a schema', () => {
			const size = getFlag('--size', z.enum(['small', 'large']), ['--size', 'small']);

			expect(size).toBe('small');
		});

		test('rejects an invalid value', () => {
			expect(() => {
				getFlag('--size', z.enum(['small', 'large']), ['--size', 'huge']);
			}).toThrow('Flag "--size": Invalid option');
		});
	});

	describe('Async', () => {
		test('async validation throws (parsing is synchronous)', () => {
			// Hand-rolled Standard Schema with an async `validate`; no dependency needed
			const asyncSchema = {
				'~standard': {
					version: 1 as const,
					vendor: 'test',
					validate: () => Promise.resolve({ value: 'async' }),
				},
			};

			expect(() => {
				typeFlag({
					asyncFlag: asyncSchema,
				}, ['--async-flag', 'value']);
			}).toThrow('Flag "--async-flag": Async schema validation is not supported');
		});
	});
});
