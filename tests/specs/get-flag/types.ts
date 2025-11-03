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
			const str = getFlag('--foo', String);
			expectTypeOf(str).toEqualTypeOf<string | undefined>();

			const num = getFlag('--foo', Number);
			expectTypeOf(num).toEqualTypeOf<number | undefined>();

			const bool = getFlag('--foo', Boolean);
			expectTypeOf(bool).toEqualTypeOf<boolean | undefined>();
		});

		test('getFlag array types', () => {
			const strArr = getFlag('--foo', [String]);
			expectTypeOf(strArr).toEqualTypeOf<string[]>();

			const numArr = getFlag('--foo', [Number]);
			expectTypeOf(numArr).toEqualTypeOf<number[]>();

			const boolArr = getFlag('--foo', [Boolean]);
			expectTypeOf(boolArr).toEqualTypeOf<boolean[]>();
		});

		test('getFlag custom types', () => {
			const date = getFlag('--foo', toDate);
			expectTypeOf(date).toEqualTypeOf<Date | undefined>();

			const obj = getFlag('--foo', toCustomObject);
			expectTypeOf(obj).toEqualTypeOf<{ value: string } | undefined>();
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

			const anyArr = getFlag('--foo', [toAny]);
			expectTypeOf(anyArr).toEqualTypeOf<any[]>();

			const unknownArr = getFlag('--foo', [toUnknown]);
			expectTypeOf(unknownArr).toEqualTypeOf<unknown[]>();
		});
	});
});
