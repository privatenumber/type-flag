import { testSuite } from 'manten';
import { expectTypeOf } from 'expect-type';
import { getFlag } from '#type-flag';

// Test Helpers
const toDate = (s: string) => new Date(s);
const toCustomObject = (s: string) => ({ value: s });
const toAny = (v: any) => v;
const toUnknown = (v: string) => v as unknown;

export default testSuite(({ describe }) => {
	describe('Types', ({ test }) => {
		test('getFlag standard types', () => {
			const string_ = getFlag('--foo', String);
			expectTypeOf(string_).toEqualTypeOf<string | undefined>();

			const number_ = getFlag('--foo', Number);
			expectTypeOf(number_).toEqualTypeOf<number | undefined>();

			const bool = getFlag('--foo', Boolean);
			expectTypeOf(bool).toEqualTypeOf<boolean | undefined>();
		});

		test('getFlag array types', () => {
			const stringArray = getFlag('--foo', [String]);
			expectTypeOf(stringArray).toEqualTypeOf<string[]>();

			const numberArray = getFlag('--foo', [Number]);
			expectTypeOf(numberArray).toEqualTypeOf<number[]>();

			const boolArray = getFlag('--foo', [Boolean]);
			expectTypeOf(boolArray).toEqualTypeOf<boolean[]>();
		});

		test('getFlag custom types', () => {
			const date = getFlag('--foo', toDate);
			expectTypeOf(date).toEqualTypeOf<Date | undefined>();

			const object = getFlag('--foo', toCustomObject);
			expectTypeOf(object).toEqualTypeOf<{ value: string } | undefined>();
		});

		test('getFlag custom array types', () => {
			const dates = getFlag('--foo', [toDate]);
			expectTypeOf(dates).toEqualTypeOf<Date[]>();

			const objs = getFlag('--foo', [toCustomObject]);
			expectTypeOf(objs).toEqualTypeOf<{ value: string }[]>();
		});

		test('getFlag special types', () => {
			const anyFlag = getFlag('--foo', toAny);
			expectTypeOf(anyFlag).toEqualTypeOf<any | undefined>();

			const unknownFlag = getFlag('--foo', toUnknown);
			expectTypeOf(unknownFlag).toEqualTypeOf<unknown | undefined>();

			const anyArray = getFlag('--foo', [toAny]);
			expectTypeOf(anyArray).toEqualTypeOf<any[]>();

			const unknownArray = getFlag('--foo', [toUnknown]);
			expectTypeOf(unknownArray).toEqualTypeOf<unknown[]>();
		});
	});
});
