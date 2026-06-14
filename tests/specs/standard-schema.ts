import { describe, test, expect } from 'manten';
import { expectTypeOf } from 'expect-type';
import * as z from 'zod';
import * as v from 'valibot';
import { type } from 'arktype';
import {
	typeFlag,
	getFlag,
} from '#type-flag';
import { isStandardSchema, type StandardSchemaV1 } from '#type-flag/internal';

describe('standard-schema', () => {
	describe('Zod', () => {
		test('enum returns the matched value', () => {
			const parsed = typeFlag({
				size: z.enum(['small', 'medium', 'large']),
			}, ['--size', 'medium']);

			expect(parsed.flags.size).toBe('medium');
			expectTypeOf(parsed.flags.size).toEqualTypeOf<'small' | 'medium' | 'large' | undefined>();
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
			expectTypeOf(parsed.flags.port).toEqualTypeOf<number | undefined>();
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
			expectTypeOf(parsed.flags.list).toEqualTypeOf<string[] | undefined>();
		});

		test('repeated flag collects and validates each element', () => {
			const parsed = typeFlag({
				tag: [z.enum(['debug', 'info', 'warn'])],
			}, ['--tag', 'debug', '--tag', 'warn']);

			expect(parsed.flags.tag).toStrictEqual(['debug', 'warn']);
			expectTypeOf(parsed.flags.tag).toEqualTypeOf<('debug' | 'info' | 'warn')[]>();
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

					// `as const` preserves the literal union; a plain default widens to string
					default: 'small' as const,
				},
			}, []);

			expect(parsed.flags.size).toBe('small');
			expectTypeOf(parsed.flags.size).toEqualTypeOf<'small' | 'large'>();
		});

		test('absent raw schema flag is undefined (schema .default is not a type-flag default)', () => {
			const parsed = typeFlag({
				size: z.enum(['small', 'large']),
			}, []);

			expect(parsed.flags.size).toBe(undefined);
			expectTypeOf(parsed.flags.size).toEqualTypeOf<'small' | 'large' | undefined>();
		});

		test('{ type } object form behaves like the bare schema', () => {
			const parsed = typeFlag({
				size: {
					type: z.enum(['small', 'large']),
				},
			}, ['--size', 'small']);

			expect(parsed.flags.size).toBe('small');
			expectTypeOf(parsed.flags.size).toEqualTypeOf<'small' | 'large' | undefined>();
		});

		test('{ type: [schema] } object form collects an array', () => {
			const parsed = typeFlag({
				tags: {
					type: [z.string()],
				},
			}, ['--tags', 'a', '--tags', 'b']);

			expect(parsed.flags.tags).toStrictEqual(['a', 'b']);
			expectTypeOf(parsed.flags.tags).toEqualTypeOf<string[]>();
		});

		test('array schema with a default falls back to the default and stays a clean array', () => {
			const parsed = typeFlag({
				tags: {
					type: [z.string()],
					default: () => ['x'],
				},
			}, []);

			expect(parsed.flags.tags).toStrictEqual(['x']);

			// Guards against the default unioning into an un-reduced `string[] | string[]`
			expectTypeOf(parsed.flags.tags).toEqualTypeOf<string[]>();
		});
	});

	// Proves the adapter is library-agnostic, not coupled to Zod
	describe('Valibot', () => {
		test('picklist returns the matched value', () => {
			const parsed = typeFlag({
				mode: v.picklist(['dev', 'prod']),
			}, ['--mode', 'dev']);

			expect(parsed.flags.mode).toBe('dev');
			expectTypeOf(parsed.flags.mode).toEqualTypeOf<'dev' | 'prod' | undefined>();
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
			expectTypeOf(parsed.flags.email).toEqualTypeOf<string | undefined>();
		});

		test('email rejects an invalid string', () => {
			expect(() => {
				typeFlag({
					email: v.pipe(v.string(), v.email()),
				}, ['--email', 'not-an-email']);
			}).toThrow('Flag "--email": Invalid email');
		});
	});

	// ArkType schemas are callable (typeof === 'function') yet implement Standard
	// Schema, so they must still route through validation, not the raw-parser path.
	describe('ArkType (callable schema)', () => {
		test('returns the matched value', () => {
			const parsed = typeFlag({
				size: type("'small' | 'large'"),
			}, ['--size', 'small']);

			expect(parsed.flags.size).toBe('small');
			expectTypeOf(parsed.flags.size).toEqualTypeOf<'small' | 'large' | undefined>();
		});

		test('rejects an invalid value', () => {
			expect(() => {
				typeFlag({
					size: type("'small' | 'large'"),
				}, ['--size', 'huge']);
			}).toThrow('Flag "--size":');
		});

		test('absent flag is undefined (callable schema is not treated as a default)', () => {
			const parsed = typeFlag({
				size: type("'small' | 'large'"),
			}, []);

			expect(parsed.flags.size).toBe(undefined);
		});
	});

	describe('getFlag', () => {
		test('parses and validates with a schema', () => {
			const size = getFlag('--size', z.enum(['small', 'large']), ['--size', 'small']);

			expect(size).toBe('small');
			expectTypeOf(size).toEqualTypeOf<'small' | 'large' | undefined>();
		});

		test('rejects an invalid value', () => {
			expect(() => {
				getFlag('--size', z.enum(['small', 'large']), ['--size', 'huge']);
			}).toThrow('Flag "--size": Invalid option');
		});

		test('collects an array from a wrapped schema', () => {
			const tags = getFlag('--tag', [z.string()], ['--tag', 'a', '--tag', 'b']);

			expect(tags).toStrictEqual(['a', 'b']);
			expectTypeOf(tags).toEqualTypeOf<string[]>();
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
			}).toThrow('Flag "--async-flag": Async schemas are not supported');
		});
	});

	describe('Inference', () => {
		test('schema and native flags infer independently in one call', () => {
			const parsed = typeFlag({
				schemaEnum: z.enum(['a', 'b']),
				nativeBoolean: Boolean,
				nativeString: String,
				schemaArray: [z.coerce.number()],
				schemaDefault: {
					type: z.enum(['x', 'y']),
					default: 'x' as const,
				},
			}, ['--schema-enum', 'a', '--native-boolean', '--native-string', 'hi', '--schema-array', '3']);

			expect(parsed.flags.schemaEnum).toBe('a');
			expect(parsed.flags.nativeBoolean).toBe(true);
			expect(parsed.flags.schemaArray).toStrictEqual([3]);
			expect(parsed.flags.schemaDefault).toBe('x');

			expectTypeOf(parsed.flags).toEqualTypeOf<{
				schemaEnum: 'a' | 'b' | undefined;
				nativeBoolean: boolean | undefined;
				nativeString: string | undefined;
				schemaArray: number[];
				schemaDefault: 'x' | 'y';
			}>();
		});

		test('a schema whose output is an array is treated as a scalar', () => {
			// Documented gotcha: `z.array(...)` validates a single token, so use `[schema]`
			// to accept multiple. At runtime it rejects the token; the type is the output.
			const schemas = {
				tags: z.array(z.string()),
			};

			expect(() => typeFlag(schemas, ['--tags', 'a'])).toThrow('Flag "--tags":');

			const parsed = typeFlag(schemas, []);
			expectTypeOf(parsed.flags.tags).toEqualTypeOf<string[] | undefined>();
		});

		test('rejects a multi-element schema tuple', () => {
			typeFlag({
				// @ts-expect-error only one element is allowed in the array form
				tags: [z.string(), z.string()],
			}, []);
		});
	});

	describe('isStandardSchema', () => {
		test('detects schemas (Zod, Valibot, ArkType)', () => {
			expect(isStandardSchema(z.string())).toBe(true);
			expect(isStandardSchema(v.string())).toBe(true);
			// ArkType schemas are callable, exercising the function branch
			expect(isStandardSchema(type('string'))).toBe(true);
		});

		test('rejects parser functions, plain objects, and primitives', () => {
			expect(isStandardSchema((value: string) => value)).toBe(false);
			expect(isStandardSchema(String)).toBe(false);
			expect(isStandardSchema({ type: String })).toBe(false);
			expect(isStandardSchema(null)).toBe(false);
			expect(isStandardSchema(undefined)).toBe(false);
			expect(isStandardSchema('string')).toBe(false);
		});

		test('StandardSchemaV1 type and InferOutput are exported and usable', () => {
			const sizeSchema = z.enum(['small', 'large']);
			expectTypeOf<StandardSchemaV1.InferOutput<typeof sizeSchema>>().toEqualTypeOf<'small' | 'large'>();

			const value: unknown = sizeSchema;
			if (isStandardSchema(value)) {
				expectTypeOf(value).toEqualTypeOf<StandardSchemaV1>();
			}
		});
	});
});
