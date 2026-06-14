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
});
