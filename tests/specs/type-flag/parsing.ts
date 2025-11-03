import { testSuite, expect } from 'manten';
import { typeFlag } from '#type-flag';

export default testSuite(({ describe }) => {
	describe('Parsing', ({ describe, test }) => {
		describe('edge-cases', ({ test }) => {
			test('Object prototype property', () => {
				const parsed = typeFlag({}, ['--to-string']);
				expect<Record<PropertyKey, never>>(parsed.flags).toStrictEqual({});
				expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({
					'to-string': [true],
				});
			});

			test('string to boolean', () => {
				const parsed = typeFlag({
					boolean: Boolean,
				}, ['--boolean=value']);

				expect<{ boolean?: boolean }>(parsed.flags).toStrictEqual({
					boolean: true,
				});
			});

			test('end of flags', () => {
				const parsed = typeFlag({
					string: String,
				}, ['--string', '--', 'value']);

				expect<{ string?: string }>(parsed.flags).toStrictEqual({
					string: '',
				});

				expect<string[] & { '--': string[] }>(parsed._).toStrictEqual(
					Object.assign(
						['value'],
						{ '--': ['value'] },
					),
				);
			});

			test('Flag can start with _', () => {
				const parsed = typeFlag({
					_flag: Boolean,
				}, ['--_flag']);

				expect<{ _flag?: boolean }>(parsed.flags).toStrictEqual({
					_flag: true,
				});
			});

			test('Negative number as argument', () => {
				const parsed = typeFlag({
					number: Number,
				}, ['-123']);

				expect<{ number?: number }>(parsed.flags).toStrictEqual({
					number: undefined,
				});
				expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({
					1: [true],
					2: [true],
					3: [true],
				});
			});

			test('Negative number with flag', () => {
				const parsed = typeFlag({
					number: Number,
				}, ['--number', '-123']);

				// -123 is parsed as flag group -1 -2 -3, leaving number with no value
				expect<{ number?: number }>(parsed.flags).toStrictEqual({
					number: Number.NaN,
				});
				expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({
					1: [true],
					2: [true],
					3: [true],
				});
				expect<string[] & { '--': string[] }>(parsed._).toStrictEqual(
					Object.assign(
						[],
						{ '--': [] },
					),
				);
			});

			test('Negative number with equals', () => {
				const parsed = typeFlag({
					number: Number,
				}, ['--number=-123']);

				expect<{ number?: number }>(parsed.flags).toStrictEqual({
					number: -123,
				});
			});

			test('invalid consolidated aliases', () => {
				const parsed = typeFlag(
					{}, ['-invalidAlias'],
				);

				expect<{
					_: string[] & { '--': string[] };
					flags: Record<PropertyKey, never>;
					unknownFlags: Record<string, (string | boolean)[]>;
				}>(parsed).toStrictEqual({
					_: Object.assign([], { '--': [] }),
					flags: {},
					unknownFlags: {
						i: [true, true, true],
						n: [true],
						v: [true],
						a: [true, true],
						l: [true, true],
						d: [true],
						A: [true],
						s: [true],
					},
				});
			});

			test('Frozen argv array', () => {
				const argv = Object.freeze(['--flag', 'value'] as string[]);

				expect(() => {
					typeFlag(
						{
							flag: String,
						},
						argv as string[],
					);
				}).toThrow();
			});

			test('Unknown flags starting with numbers', () => {
				const parsed = typeFlag({}, ['--123abc', '--456', '-7', '-8a']);

				expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({
					'123abc': [true],
					456: [true],
					7: [true],
					8: [true],
					a: [true],
				});
			});
		});

		test('end of flags', () => {
			const argv = ['--flagA', '--', '--flagB'];
			const parsed = typeFlag(
				{
					flagA: String,
					flagB: String,
				},
				argv,
			);

			expect<string | undefined>(parsed.flags.flagA).toBe('');
			expect<string | undefined>(parsed.flags.flagB).toBe(undefined);
			expect<string[] & { '--': string[] }>(parsed._).toStrictEqual(
				Object.assign(
					['--flagB'],
					{
						'--': ['--flagB'],
					},
				),
			);
			expect<string[]>(argv).toStrictEqual([]);
		});

		test('strings, booleans, numbers', () => {
			const argv = ['--string', 'hello', '--boolean', 'world', '--string', '--number', '2', '--number'];
			const parsed = typeFlag(
				{
					string: String,
					boolean: Boolean,
					number: Number,
				},
				argv,
			);

			expect<string | undefined>(parsed.flags.string).toBe('');
			expect<boolean | undefined>(parsed.flags.boolean).toBe(true);
			expect<number | undefined>(parsed.flags.number).toBe(Number.NaN);
			expect<string[] & { '--': string[] }>(parsed._).toStrictEqual(
				Object.assign(
					['world'],
					{ '--': [] },
				),
			);
			expect<string[]>(argv).toStrictEqual([]);
		});

		test('number edge cases', () => {
			const argv = ['--infinity', 'Infinity', '--negInfinity=-Infinity', '--scientific', '1.5e10', '--negScientific=-2.3e-5', '--large', '9007199254740992'];
			const parsed = typeFlag(
				{
					infinity: Number,
					negInfinity: Number,
					scientific: Number,
					negScientific: Number,
					large: Number,
				},
				argv,
			);

			expect<number | undefined>(parsed.flags.infinity).toBe(Number.POSITIVE_INFINITY);
			// Negative numbers must use = delimiter to avoid being parsed as flags
			expect<number | undefined>(parsed.flags.negInfinity).toBe(Number.NEGATIVE_INFINITY);
			expect<number | undefined>(parsed.flags.scientific).toBe(1.5e10);
			expect<number | undefined>(parsed.flags.negScientific).toBe(-2.3e-5);
			expect<number | undefined>(parsed.flags.large).toBe(9_007_199_254_740_992);
			expect<string[]>(argv).toStrictEqual([]);
		});

		test('number type coercion with whitespace', () => {
			const argv = ['--numA=  123  ', '--numB=\t456\t', '--numC=\n789\n'];
			const parsed = typeFlag(
				{
					numA: Number,
					numB: Number,
					numC: Number,
				},
				argv,
			);

			expect<number | undefined>(parsed.flags.numA).toBe(123);
			expect<number | undefined>(parsed.flags.numB).toBe(456);
			expect<number | undefined>(parsed.flags.numC).toBe(789);
		});

		test('convert kebab-case to camelCase', () => {
			const argv = ['--some-string=2', '--someString=3', '--some-string=4'];
			const parsed = typeFlag(
				{
					someString: String,
				},
				argv,
			);

			expect<string | undefined>(parsed.flags.someString).toBe('4');
			expect<string[]>(argv).toStrictEqual([]);
		});

		test('kebab-case flags', () => {
			const argv = ['--some-string=2', '--someString=3', '--some-string=4'];
			const parsed = typeFlag(
				{
					'some-string': String,
				},
				argv,
			);

			expect<string | undefined>(parsed.flags['some-string']).toBe('4');
			expect(!('someString' in parsed.flags)).toBe(true);
			expect<string[]>(argv).toStrictEqual([]);
		});

		test('flag=', () => {
			const argv = ['--string=hello', '-s=bye', '--string=', '--boolean=true', '--boolean=false', '--boolean=', 'world', '--number=3.14', '--number='];
			const parsed = typeFlag(
				{
					string: {
						type: String,
						alias: 's',
					},
					boolean: Boolean,
					number: Number,
				},
				argv,
			);

			expect<string | undefined>(parsed.flags.string).toBe('');
			expect<boolean | undefined>(parsed.flags.boolean).toBe(true);
			expect<number | undefined>(parsed.flags.number).toBe(Number.NaN);
			expect<string[] & { '--': string[] }>(parsed._).toStrictEqual(
				Object.assign(
					['world'],
					{ '--': [] },
				),
			);
			expect<string[]>(argv).toStrictEqual([]);
		});

		test('boolean case sensitivity', () => {
			const argv = ['--flagA=true', '--flagB=True', '--flagC=TRUE', '--flagD=false', '--flagE=False', '--flagF=FALSE', '--flagG=TrUe', '--flagH=FaLsE'];
			const parsed = typeFlag(
				{
					flagA: Boolean,
					flagB: Boolean,
					flagC: Boolean,
					flagD: Boolean,
					flagE: Boolean,
					flagF: Boolean,
					flagG: Boolean,
					flagH: Boolean,
				},
				argv,
			);

			expect<boolean | undefined>(parsed.flags.flagA).toBe(true);
			expect<boolean | undefined>(parsed.flags.flagB).toBe(true);
			expect<boolean | undefined>(parsed.flags.flagC).toBe(true);
			expect<boolean | undefined>(parsed.flags.flagD).toBe(false);
			expect<boolean | undefined>(parsed.flags.flagE).toBe(true);
			expect<boolean | undefined>(parsed.flags.flagF).toBe(true);
			expect<boolean | undefined>(parsed.flags.flagG).toBe(true);
			expect<boolean | undefined>(parsed.flags.flagH).toBe(true);
		});

		test('flag: - to allow the use of = in values (or vice versa)', () => {
			const argv = ['--string:A=hello', '-s:B=bye'];
			const parsed = typeFlag(
				{
					string: {
						type: String,
						alias: 's',
					},
				},
				argv,
			);

			expect<string | undefined>(parsed.flags.string).toBe('B=bye');
			expect<string[]>(argv).toStrictEqual([]);
		});

		test('flag: . to allow dot-notation', () => {
			const argv = ['--string.A=hello', '-s.B=bye'];
			const parsed = typeFlag(
				{
					string: {
						type: String,
						alias: 's',
					},
				},
				argv,
			);

			expect<string | undefined>(parsed.flags.string).toBe('B=bye');
			expect<string[]>(argv).toStrictEqual([]);
		});

		test('Unicode in values', () => {
			const argv = ['--emoji=🎉', '--japanese=日本語', '--mixed=Hello世界🌍', '--arabic=مرحبا'];
			const parsed = typeFlag(
				{
					emoji: String,
					japanese: String,
					mixed: String,
					arabic: String,
				},
				argv,
			);

			expect<string | undefined>(parsed.flags.emoji).toBe('🎉');
			expect<string | undefined>(parsed.flags.japanese).toBe('日本語');
			expect<string | undefined>(parsed.flags.mixed).toBe('Hello世界🌍');
			expect<string | undefined>(parsed.flags.arabic).toBe('مرحبا');
		});

		test('Multiple delimiters in flag values', () => {
			const argv = ['--flagA=x=y', '--flagB=x=y=z', '--flagC:x=y', '--flagD.x:y=z'];
			const parsed = typeFlag(
				{
					flagA: String,
					flagB: String,
					flagC: String,
					flagD: String,
				},
				argv,
			);

			expect<string | undefined>(parsed.flags.flagA).toBe('x=y');
			expect<string | undefined>(parsed.flags.flagB).toBe('x=y=z');
			expect<string | undefined>(parsed.flags.flagC).toBe('x=y');
			expect<string | undefined>(parsed.flags.flagD).toBe('x:y=z');
		});

		describe('aliases', ({ test }) => {
			test('aliases', () => {
				const argv = ['-s', 'hello', '-b', 'world', '-1', 'goodbye'];
				const parsed = typeFlag(
					{
						string: {
							type: String,
							alias: 's',
						},
						boolean: {
							type: Boolean,
							alias: 'b',
						},
						numberAlias: {
							type: String,
							alias: '1',
						},
					},
					argv,
				);

				expect<string | undefined>(parsed.flags.string).toBe('hello');
				expect<boolean | undefined>(parsed.flags.boolean).toBe(true);
				expect<string | undefined>(parsed.flags.numberAlias).toBe('goodbye');
				expect<string[]>(Object.keys(parsed.flags)).toStrictEqual(['string', 'boolean', 'numberAlias']);
				expect<string[]>(parsed._).toStrictEqual(
					Object.assign(
						['world'],
						{ '--': [] },
					),
				);
				expect<string[]>(argv).toStrictEqual([]);
			});

			test('alias with empty string', () => {
				const argv = ['-a'];
				const parsed = typeFlag(
					{
						alias: {
							type: [String],
							alias: 'a',
						},
					},
					argv,
				);

				expect<string[]>(parsed.flags.alias).toStrictEqual(['']);
				expect<string[]>(argv).toStrictEqual([]);
			});

			test('alias group with value', () => {
				const argv = ['-aliasesa=value'];
				const parsed = typeFlag(
					{
						alias: {
							type: [String],
							alias: 'a',
						},
					},
					argv,
				);

				expect<string[]>(parsed.flags.alias).toStrictEqual(['', '', 'value']);
				expect<string[]>(argv).toStrictEqual([]);
			});

			test('should not accept aliases with --', () => {
				const argv = ['--a'];
				const parsed = typeFlag(
					{
						alias: {
							type: Boolean,
							alias: 'a',
						},
					},
					argv,
				);
				expect<boolean | undefined>(parsed.flags.alias).toBe(undefined);
				expect<(string | boolean)[]>(parsed.unknownFlags.a).toStrictEqual([true]);
				expect<string[]>(argv).toStrictEqual([]);
			});

			test('single-character alias', () => {
				const argv = ['-x', '1', '-y', '2'];
				const parsed = typeFlag(
					{
						xFlag: {
							type: Number,
							alias: 'x',
						},
						yFlag: {
							type: Number,
							alias: 'y',
						},
					},
					argv,
				);

				expect<number | undefined>(parsed.flags.xFlag).toBe(1);
				expect<number | undefined>(parsed.flags.yFlag).toBe(2);
			});

			test('single-character alias grouping', () => {
				const argv = ['-am', 'hello'];
				const parsed = typeFlag(
					{
						aFlag: {
							type: Boolean,
							alias: 'a',
						},
						message: {
							type: String,
							alias: 'm',
						},
					},
					argv,
				);

				expect<boolean | undefined>(parsed.flags.aFlag).toBe(true);
				expect<string | undefined>(parsed.flags.message).toBe('hello');
			});

			test('alias group with all known flags', () => {
				const argv = ['-abc'];
				const parsed = typeFlag(
					{
						alpha: {
							type: Boolean,
							alias: 'a',
						},
						beta: {
							type: Boolean,
							alias: 'b',
						},
						gamma: {
							type: Boolean,
							alias: 'c',
						},
					},
					argv,
				);

				expect<boolean | undefined>(parsed.flags.alpha).toBe(true);
				expect<boolean | undefined>(parsed.flags.beta).toBe(true);
				expect<boolean | undefined>(parsed.flags.gamma).toBe(true);
				expect<string[]>(argv).toStrictEqual([]);
			});

			test('alias group with mix of known and unknown flags', () => {
				const argv = ['-axc'];
				const parsed = typeFlag(
					{
						alpha: {
							type: Boolean,
							alias: 'a',
						},
						gamma: {
							type: Boolean,
							alias: 'c',
						},
					},
					argv,
				);

				expect<boolean | undefined>(parsed.flags.alpha).toBe(true);
				expect<boolean | undefined>(parsed.flags.gamma).toBe(true);
				expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({
					x: [true],
				});
				expect<string[]>(argv).toStrictEqual([]);
			});
		});

		test('unknown flags', () => {
			const argv = [
				'--unknownFlag',
				'arg1',
				'--unknownFlag=false',
				'--unknownFlag=',
				'arg2',
				'-u',
				'arg3',
				'-u=value',
				'-3',
				'-sdf',
				'arg4',
				'-ff=a',
				'--kebab-case',
				'--toString',
			];
			const parsed = typeFlag(
				{},
				argv,
			);

			expect<{
				[flag: string]: never;
			}>(parsed.flags).toStrictEqual({});

			type UnknownFlags = {
				[flag: string]: (boolean | string)[];
			};

			expect<UnknownFlags>(parsed.unknownFlags).toStrictEqual({
				unknownFlag: [true, 'false', ''],
				u: [true, 'value'],
				3: [true],
				s: [true],
				d: [true],
				f: [true, true, 'a'],
				'kebab-case': [true],
				toString: [true],
			});
			expect<string[]>(parsed._).toStrictEqual(
				Object.assign(
					['arg1', 'arg2', 'arg3', 'arg4'],
					{ '--': [] },
				),
			);
			expect<string[]>(argv).toStrictEqual([]);
		});

		describe('ignore', ({ test }) => {
			test('specific known flag', () => {
				const argv = ['--string', 'a', '--string=b', '--unknown', 'c', '--unknown=d', '-u', '-vvv=1'];
				const parsed = typeFlag(
					{
						string: [String],
					},
					argv,
					{
						ignore: (type, flagName) => (
							type === 'known-flag'
								&& flagName === 'string'
						),
					},
				);

				expect<{
					flags: {
						string: string[];
					};
					unknownFlags: Record<string, (string | boolean)[]>;
					_: string[] & { '--': string[] };
				}>(parsed).toStrictEqual({
					flags: {
						string: [],
					},
					unknownFlags: {
						unknown: [true, 'd'],
						u: [true],
						v: [true, true, '1'],
					},
					_: Object.assign(
						['a', 'c'],
						{ '--': [] },
					),
				});
				expect<string[]>(argv).toStrictEqual(['--string', '--string=b']);
			});

			test('unknown flags', () => {
				const argv = ['--string', 'a', '--string=b', '--unknown', 'c', '--unknown=d', '-u', '-vbv=1', '-us=d'];
				const parsed = typeFlag(
					{
						string: {
							type: [String],
							alias: 's',
						},
						boolean: {
							type: Boolean,
							alias: 'b',
						},
					},
					argv,
					{
						ignore: type => type === 'unknown-flag',
					},
				);

				expect<{
					flags: {
						string: string[];
						boolean: boolean | undefined;
					};
					unknownFlags: Record<string, (string | boolean)[]>;
					_: string[] & { '--': string[] };
				}>(parsed).toStrictEqual({
					flags: {
						string: ['a', 'b', 'd'],
						boolean: true,
					},
					unknownFlags: {},
					_: Object.assign(
						['c'],
						{ '--': [] },
					),
				});
				expect<string[]>(argv).toStrictEqual(['--unknown', '--unknown=d', '-u', '-vv=1', '-u']);
			});

			test('after first argument', () => {
				const argv = ['--string', 'value', 'first-arg', '--string=b', '--string', 'c', '--unknown=d', '-u', '--', 'hello'];

				let ignore = false;
				const parsed = typeFlag(
					{
						string: [String],
					},
					argv,
					{
						ignore: (type) => {
							if (ignore) {
								return true;
							}

							const isArgument = type === 'argument';
							if (isArgument) {
								ignore = isArgument;
								return isArgument;
							}
						},
					},
				);

				expect<{
					flags: {
						string: string[];
					};
					unknownFlags: Record<string, (string | boolean)[]>;
					_: string[] & { '--': string[] };
				}>(parsed).toStrictEqual({
					flags: {
						string: ['value'],
					},
					unknownFlags: {},
					_: Object.assign(
						[],
						{ '--': [] },
					),
				});
				expect<string[]>(argv).toStrictEqual(['first-arg', '--string=b', '--string', 'c', '--unknown=d', '-u', '--', 'hello']);
			});

			test('end of flags', () => {
				const argv = ['--string', 'hello', 'a', '--', 'b', '--string=b', '--unknown', '--boolean'];
				const parsed = typeFlag(
					{
						string: {
							type: String,
							alias: 's',
						},
						boolean: {
							type: Boolean,
							alias: 'b',
						},
					},
					argv,
					{
						ignore: (type, value) => (type === 'argument' && value === '--'),
					},
				);

				expect<{
					flags: {
						string: string | undefined;
						boolean: boolean | undefined;
					};
					unknownFlags: Record<string, (string | boolean)[]>;
					_: string[] & { '--': string[] };
				}>(parsed).toStrictEqual({
					flags: {
						string: 'hello',
						boolean: undefined,
					},
					unknownFlags: {},
					_: Object.assign(
						['a'],
						{ '--': [] },
					),
				});
				expect<string[]>(argv).toStrictEqual(['--', 'b', '--string=b', '--unknown', '--boolean']);
			});

			test('ignore callback throws error', () => {
				expect(() => {
					typeFlag(
						{
							string: String,
						},
						['--string', 'value'],
						{
							ignore: () => {
								throw new Error('Ignore callback error');
							},
						},
					);
				}).toThrow('Ignore callback error');
			});

			test('ignore callback returns non-boolean', () => {
				const argv = ['--string', 'value', '--unknown', 'arg'];
				const parsed = typeFlag(
					{
						string: String,
					},
					argv,
					{
						ignore: () => 'truthy' as unknown as boolean,
					},
				);

				expect<string | undefined>(parsed.flags.string).toBe(undefined);
				expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({});
				expect<string[] & { '--': string[] }>(parsed._).toStrictEqual(
					Object.assign(
						[],
						{ '--': [] },
					),
				);
				expect<string[]>(argv).toStrictEqual(['--string', 'value', '--unknown', 'arg']);
			});
		});

		test('custom type', () => {
			const ParseDate = (dateString: string) => new Date(dateString);

			const possibleJsFormats = ['cjs', 'esm', 'amd', 'umd'] as const;
			type JsFormats = typeof possibleJsFormats[number];
			const JsFormat = (format: JsFormats) => {
				if (!possibleJsFormats.includes(format)) {
					throw new Error(`Invalid format: "${format}"`);
				}

				return format;
			};

			const argv = [
				'--date=2011-05-03',
				'--format=esm',
			];
			const parsed = typeFlag(
				{
					date: ParseDate,
					format: JsFormat,
				},
				argv,
			);

			expect<Date | undefined>(parsed.flags.date).toStrictEqual(ParseDate('2011-05-03'));
			expect<JsFormats | undefined>(parsed.flags.format).toBe('esm');
			expect<string[]>(argv).toStrictEqual([]);
		});

		test('strings, booleans, numbers, array', () => {
			const argv = ['--boolean', 'world', '--number', '2', '--number', '--number-array', '1', '--number-array', '2', '--string-array', 'a', '--string-array', 'b'];
			const parsed = typeFlag(
				{
					string: String,
					boolean: Boolean,
					number: Number,
					stringArray: [String],
					numberArray: {
						type: [Number],
					},
				},
				argv,
			);

			expect<string | undefined>(parsed.flags.string).toBe(undefined);
			expect<boolean | undefined>(parsed.flags.boolean).toBe(true);
			expect<number | undefined>(parsed.flags.number).toBe(Number.NaN);
			expect<string[]>(parsed.flags.stringArray).toStrictEqual(['a', 'b']);
			expect<number[]>(parsed.flags.numberArray).toStrictEqual([1, 2]);
			expect<string[]>(parsed._).toStrictEqual(
				Object.assign(
					['world'],
					{ '--': [] },
				),
			);
			expect<string[]>(argv).toStrictEqual([]);
		});

		describe('Default flag value', ({ test }) => {
			test('Types and parsing', () => {
				const argv: string[] = [];
				const parsed = typeFlag(
					{
						string: {
							type: String,
							default: 'hello world',
						},

						// Ideally, we can block this with a type error but not possible AFAIK
						// Supporting reluctantly...
						inconsistentTypes: {
							type: Boolean,
							default: 1,
						},

						inconsistentTypesB: {
							type: Boolean,
							default: undefined,
						},

						arrayOfStrings: {
							type: [String],
							default: () => ['hello'],
						},

						inconsistentTypesC: {
							type: Number,
							default: 'world',
						},

						noDefault: {
							type: [String],
						},
					},
					argv,
				);

				expect<string>(parsed.flags.string).toBe('hello world');
				expect<boolean | number>(parsed.flags.inconsistentTypes).toBe(1);
				expect<boolean | undefined>(parsed.flags.inconsistentTypesB).toBe(undefined);
				expect<string[]>(parsed.flags.arrayOfStrings).toStrictEqual(['hello']);
				expect<string | number>(parsed.flags.inconsistentTypesC).toBe('world');
				expect<string[]>(parsed.flags.noDefault).toStrictEqual([]);
				expect<string[]>(argv).toStrictEqual([]);
			});
		});
	});
});
