import { testSuite } from 'manten';
import { expectTypeOf } from 'expect-type';
import {
	typeFlag,
	type Flags,
	type TypeFlag,
	type TypeFlagOptions,
	type IgnoreFunction,
} from '#type-flag';

// Test Helpers
const toDate = (s: string) => new Date(s);
const toCustomObject = (s: string) => ({ value: s });
const toAny = (v: string) => v as any; // eslint-disable-line @typescript-eslint/no-explicit-any
const toUnknown = (v: string) => v as unknown;

export default testSuite(({ describe }) => {
	describe('Types', ({ describe, test }) => {
		describe('Errors', ({ test }) => {
			test('Only one element in array allowed', () => {
				typeFlag({
					// @ts-expect-error only one element allowed
					flagB: [String, String],

					// @ts-expect-error only one element allowed
					flagC: {
						type: [String, String],
						alias: 'a',
					},
				}, []);
			});

			test('Alias should be a string', () => {
				typeFlag({
					// @ts-expect-error alias must be a string
					badAlias: {
						type: String,
						alias: 1,
					},
				}, []);
			});
		});

		describe('Inference', ({ test }) => {
			test('typeFlag return type (Comprehensive)', () => {
				const parsed = typeFlag({
					// Basic types
					booleanFlag: Boolean,
					booleanFlagDefault: {
						type: Boolean,
						default: false,
					},
					stringFlag: String,
					stringFlagDefault: {
						type: String,
						default: 'hello',
					},
					numberFlag: Number,
					numberFlagDefault: {
						type: Number,
						default: 1,
					},

					// Array types
					booleanArr: [Boolean],
					stringArr: [String],
					numberArr: [Number],
					stringArrDefault: {
						type: [String],
						default: () => ['a', 'b'],
					},

					// Custom type functions
					date: toDate,
					dateDefault: {
						type: toDate,
						default: () => new Date(),
					},
					customObj: {
						type: toCustomObject,
						alias: 'c',
					},

					// Custom array type functions
					dates: [toDate],
					datesDefault: {
						type: [toDate],
						default: () => [new Date()],
					},

					// Extra options
					extraOptions: {
						type: Boolean,
						alias: 'e',
						default: false,
						description: 'Some description',
					},
				});

				expectTypeOf(parsed).toEqualTypeOf<{
					flags: {
						// Basic types
						booleanFlag: boolean | undefined;
						booleanFlagDefault: boolean;
						stringFlag: string | undefined;
						stringFlagDefault: string;
						numberFlag: number | undefined;
						numberFlagDefault: number;

						// Array types
						booleanArr: boolean[];
						stringArr: string[];
						numberArr: number[];
						stringArrDefault: string[];

						// Custom
						date: Date | undefined;
						dateDefault: Date;
						customObj: { value: string } | undefined;

						// Custom array
						dates: Date[];
						datesDefault: Date[];

						// Extra
						extraOptions: boolean;
					};
					unknownFlags: {
						[flag: string]: (string | boolean)[];
					};
					_: string[] & { '--': string[] };
				}>();
			});

			test('Schema with as const assertion', () => {
				const parsed = typeFlag({
					flagA: {
						type: [String],
					},
					flagB: String,
				} as const, []);

				expectTypeOf(parsed.flags.flagA).toEqualTypeOf<string[]>();
				expectTypeOf(parsed.flags.flagB).toEqualTypeOf<string | undefined>();
			});

			test('Schema wrapped in Readonly generic', () => {
				const readonly = <F extends Flags>(
					options: Readonly<F>,
					argv: string[],
				) => typeFlag(options, argv);

				const parsed = readonly({
					flagA: {
						type: String,
					},
					flagB: {
						type: [String],
					},
				}, ['--flag-a', 'hello']);

				expectTypeOf(parsed.flags.flagA).toEqualTypeOf<string | undefined>();
				expectTypeOf(parsed.flags.flagB).toEqualTypeOf<string[]>();
			});

			test('Default type inference edge cases', () => {
				const parsed = typeFlag({
					// Single type, array default
					singleWithArrDefault: {
						type: String,
						default: () => ['a', 'b'],
					},
					// Array type, single default
					arrWithSingleDefault: {
						type: [Number],
						default: 123,
					},
					// Type/default literal mismatch
					typeMismatch: {
						type: String,
						default: 123,
					},
					// Type/default function mismatch - preserves literal type
					typeMismatchFn: {
						type: Boolean,
						default: () => 'hello',
					},
					// Type assertion widens to base type
					widenedFlag: {
						type: String,
						default: () => 'hello' as string,
					},
					// as const preserves literal type explicitly
					constFlag: {
						type: Number,
						default: () => 42 as const,
					},
				});

				expectTypeOf(parsed.flags.singleWithArrDefault).toEqualTypeOf<string | string[]>();
				expectTypeOf(parsed.flags.arrWithSingleDefault).toEqualTypeOf<number[] | number>();
				expectTypeOf(parsed.flags.typeMismatch).toEqualTypeOf<string | number>();
				expectTypeOf(parsed.flags.typeMismatchFn).toEqualTypeOf<boolean | 'hello'>();
				expectTypeOf(parsed.flags.widenedFlag).toEqualTypeOf<string>();
				expectTypeOf(parsed.flags.constFlag).toEqualTypeOf<number | 42>();
			});

			test('any/unknown/never types', () => {
				const parsed = typeFlag({
					anyFlag: toAny,
					unknownFlag: toUnknown,
					anyArr: [toAny],
					unknownArr: [toUnknown],
					// A function returning never
					neverFlag: {
						type: () => {
							throw new Error('This function never returns');
						},
					},
				});

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expectTypeOf(parsed.flags.anyFlag).toEqualTypeOf<any | undefined>();
				expectTypeOf(parsed.flags.unknownFlag).toEqualTypeOf<unknown | undefined>();

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expectTypeOf(parsed.flags.anyArr).toEqualTypeOf<any[]>();
				expectTypeOf(parsed.flags.unknownArr).toEqualTypeOf<unknown[]>();
				expectTypeOf(parsed.flags.neverFlag).toBeNever();
			});

			test('Flags type errors on invalid custom options', () => {
				type CustomOptions = {
					newProperty: string;
				};

				expectTypeOf<{
					verbose: {
						type: BooleanConstructor;
						alias: string;
						newProperty: number;
					};
				}>().not.toMatchObjectType<Flags<CustomOptions>>();
			});

			test('TypeFlag generic with schema', () => {
				type Schema = {
					name: StringConstructor;
					age: {
						type: NumberConstructor;
						default: number;
					};
					verbose: [BooleanConstructor];
					custom: typeof toDate;
					customArr: readonly [typeof toDate];
				};

				expectTypeOf<TypeFlag<Schema>>().toEqualTypeOf<{
					flags: {
						name: string | undefined;
						age: number;
						verbose: boolean[];
						custom: Date | undefined;
						customArr: Date[];
					};
					unknownFlags: {
						[flagName: string]: (string | boolean)[];
					};
					_: string[] & { '--': string[] };
				}>();
			});

			test('TypeFlag generic without parameter (default)', () => {
				expectTypeOf<TypeFlag>().toEqualTypeOf<{
					flags: {
						[flag: string]: unknown;
					};
					unknownFlags: {
						[flagName: string]: (string | boolean)[];
					};
					_: string[] & { '--': string[] };
				}>();
			});

			test('Types work in function signatures', () => {
				// Test that exported types can be used to type function parameters/returns
				const processFlags = (
					parsed: TypeFlag<{
						name: StringConstructor;
						date: typeof toDate;
					}>,
				) => ({
					name: parsed.flags.name,
					date: parsed.flags.date,
				});

				const result = processFlags(typeFlag({
					name: String,
					date: toDate,
				}));
				expectTypeOf(result.name).toEqualTypeOf<string | undefined>();
				expectTypeOf(result.date).toEqualTypeOf<Date | undefined>();

				// Test Flags as parameter type
				const createParser = (schema: Flags) => typeFlag(schema);

				const parser = createParser({ test: Boolean });
				expectTypeOf(parser.flags.test).toBeUnknown(); // Correct

				// Test TypeFlagOptions as parameter (pure type test, no runtime)
				type OptionsTest = TypeFlagOptions;
				const options: OptionsTest = { ignore: () => false };
				expectTypeOf(options).toExtend<TypeFlagOptions>();
			});
		});

		describe('TypeFlagOptions', ({ test }) => {
			test('Call-Site Signatures (Strict)', () => {
				// Declare test variable for call-site testing
				const testIgnoreFn: IgnoreFunction = () => void 0;

				// Test 'argument' overload
				// Correct arity (2 params)
				testIgnoreFn('argument', 'some/path');

				// @ts-expect-error 'argument' overload has no 3rd param
				testIgnoreFn('argument', 'some/path', undefined);

				// @ts-expect-error 'argument' overload has no 3rd param
				testIgnoreFn('argument', 'some/path', 'extra');

				// @ts-expect-error 'argument' overload expects string for 2nd param
				testIgnoreFn('argument', 123);

				// Test 'flag' overload
				// Correct arity (3 params)
				testIgnoreFn('known-flag', '--foo', 'bar');
				testIgnoreFn('unknown-flag', '--baz', undefined);

				// Correct arity (2 params, as 3rd is optional)
				testIgnoreFn('known-flag', '--foo');

				// @ts-expect-error 'flag' overload expects string for 2nd param
				testIgnoreFn('known-flag', 123);

				// @ts-expect-error 'flag' overload expects string|undefined for 3rd param
				testIgnoreFn('known-flag', '--foo', 123);

				// @ts-expect-error 'type' must be one of the three constants
				testIgnoreFn('other-type', 'foo');
			});

			// test('Implementation-Site Signature', () => {
			// 	// This test proves that TS does not narrow arg2
			// 	const options: TypeFlagOptions = {
			// 		ignore: (type, arg1, arg2) => {
			// 			// This is the *real* type inside the implementation
			// 			expectTypeOf(arg1).toEqualTypeOf<string>();
			// 			expectTypeOf(arg2).toEqualTypeOf<string | undefined>();

			// 			if (type === 'argument') {
			// 				// We confirm 'arg2' is NOT narrowed
			// 				expectTypeOf(arg2).toEqualTypeOf<string | undefined>();
			// 				return true;
			// 			}

			// 			if (type === 'known-flag' || type === 'unknown-flag') {
			// 				// We confirm 'arg2' is still the wide type
			// 				expectTypeOf(arg2).toEqualTypeOf<string | undefined>();
			// 				return false;
			// 			}
			// 		},
			// 	};

			// 	// This just proves the object is valid.
			// 	expectTypeOf(options).toExtend<TypeFlagOptions>();
			// });

			test('Optional and Minimal Signatures', () => {
				// Test minimal signature
				const minimalOptions: TypeFlagOptions = {
					ignore: type => type === 'unknown-flag',
				};
				expectTypeOf(minimalOptions).toExtend<TypeFlagOptions>();

				// Test that it's optional
				const noIgnore: TypeFlagOptions = {};
				expectTypeOf(noIgnore).toExtend<TypeFlagOptions>();

				// Test runtime usage compiles
				typeFlag({}, [], minimalOptions);
				typeFlag({}, [], noIgnore);
			});

			// TODO: This seems tautological
			// test('Flags generic with extra options', () => {
			// 	type CustomFlags = Flags<{
			// 		description: string;
			// 		required?: boolean;
			// 	}>;

			// 	const flags: CustomFlags = {
			// 		name: {
			// 			type: String,
			// 			description: 'User name',
			// 			required: true,
			// 		},
			// 		age: {
			// 			type: Number,
			// 			description: 'User age',
			// 		},
			// 		// Shorthand should also be allowed
			// 		verbose: Boolean,
			// 		ids: [Number],
			// 	};

			// 	expectTypeOf(flags).toExtend<CustomFlags>();
			// });
		});
	});
});
