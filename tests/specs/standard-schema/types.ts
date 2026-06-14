import { describe, test } from 'manten';
import { expectTypeOf } from 'expect-type';
import * as z from 'zod';
import * as v from 'valibot';
import { type } from 'arktype';
import { typeFlag, getFlag } from '#type-flag';

describe('types', () => {
	test('enum infers a string-literal union', () => {
		const parsed = typeFlag({
			size: z.enum(['small', 'medium', 'large']),
		});

		expectTypeOf(parsed.flags.size).toEqualTypeOf<'small' | 'medium' | 'large' | undefined>();
	});

	test('coerced number infers number', () => {
		const parsed = typeFlag({
			port: z.coerce.number(),
		});

		expectTypeOf(parsed.flags.port).toEqualTypeOf<number | undefined>();
	});

	test('transform infers the transformed output', () => {
		const parsed = typeFlag({
			list: z.string().transform(value => value.split(',')),
		});

		expectTypeOf(parsed.flags.list).toEqualTypeOf<string[] | undefined>();
	});

	test('repeated flag infers an array', () => {
		const parsed = typeFlag({
			level: [z.enum(['debug', 'info', 'warn'])],
		});

		expectTypeOf(parsed.flags.level).toEqualTypeOf<('debug' | 'info' | 'warn')[]>();
	});

	test('default removes undefined from the inferred type', () => {
		const parsed = typeFlag({
			size: {
				type: z.enum(['a', 'b']),

				// `as const` preserves the literal union; a plain default widens to string
				default: 'a' as const,
			},
		});

		expectTypeOf(parsed.flags.size).toEqualTypeOf<'a' | 'b'>();
	});

	test('inference is library-agnostic (Valibot)', () => {
		const parsed = typeFlag({
			mode: v.picklist(['dev', 'prod']),
		});

		expectTypeOf(parsed.flags.mode).toEqualTypeOf<'dev' | 'prod' | undefined>();
	});

	test('infers from a callable schema (ArkType)', () => {
		const parsed = typeFlag({
			size: type("'small' | 'large'"),
		});

		expectTypeOf(parsed.flags.size).toEqualTypeOf<'small' | 'large' | undefined>();
	});

	test('getFlag infers from a schema', () => {
		const size = getFlag('--size', z.enum(['small', 'large']), ['--size', 'small']);

		expectTypeOf(size).toEqualTypeOf<'small' | 'large' | undefined>();
	});

	test('{ type } object form infers like the bare schema', () => {
		const parsed = typeFlag({
			size: { type: z.enum(['small', 'large']) },
		});

		expectTypeOf(parsed.flags.size).toEqualTypeOf<'small' | 'large' | undefined>();
	});

	test('{ type: [schema] } object form infers an array', () => {
		const parsed = typeFlag({
			tags: { type: [z.string()] },
		});

		expectTypeOf(parsed.flags.tags).toEqualTypeOf<string[]>();
	});

	test('array schema with a default stays a clean array', () => {
		const parsed = typeFlag({
			tags: {
				type: [z.string()],
				default: () => ['x'],
			},
		});

		// Guards against the default unioning into an un-reduced `string[] | string[]`
		expectTypeOf(parsed.flags.tags).toEqualTypeOf<string[]>();
	});

	test('a schema whose output is an array is treated as a scalar', () => {
		// Documented gotcha: `z.array(...)` validates one token (runtime rejects it),
		// so it is a scalar flag typed as the array output. Use `[schema]` for multiple.
		const parsed = typeFlag({
			tags: z.array(z.string()),
		});

		expectTypeOf(parsed.flags.tags).toEqualTypeOf<string[] | undefined>();
	});

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
		});

		expectTypeOf(parsed.flags).toEqualTypeOf<{
			schemaEnum: 'a' | 'b' | undefined;
			nativeBoolean: boolean | undefined;
			nativeString: string | undefined;
			schemaArray: number[];
			schemaDefault: 'x' | 'y';
		}>();
	});

	test('getFlag infers an array from a wrapped schema', () => {
		const tags = getFlag('--tag', [z.string()], ['--tag', 'a', '--tag', 'b']);

		expectTypeOf(tags).toEqualTypeOf<string[]>();
	});

	test('rejects a multi-element schema tuple', () => {
		typeFlag({
			// @ts-expect-error only one element is allowed in the array form
			tags: [z.string(), z.string()],
		});
	});
});
