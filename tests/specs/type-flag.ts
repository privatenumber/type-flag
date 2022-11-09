import { testSuite, expect } from 'manten';
import { typeFlag, type Flags } from '#type-flag';

export default testSuite(({ describe }) => {
	describe('type-flag', ({ describe }) => {
		describe('Error handling', ({ describe }) => {
			describe('Invalid flag name', ({ test }) => {
				test('Empty flag name', () => {
					expect(() => {
						typeFlag({
							'': String,
						}, []);
					}).toThrow(/* 'Invalid flag name: empty' */);
				});

				test('Single character flag name', () => {
					expect(() => {
						typeFlag({
							i: String,
						}, []);
					}).toThrow(/* 'Invalid flag name: single characters are reserved for aliases' */);
				});

				test('Reserved characters', () => {
					expect(() => {
						typeFlag({ 'flag a': String }, []);
					}).toThrow(/* Flag name cannot contain the character " " */);

					expect(() => {
						typeFlag({ 'flag=b': String }, []);
					}).toThrow(/* Flag name cannot contain the character "=" */);

					expect(() => {
						typeFlag({ 'flag:c': String }, []);
					}).toThrow(/* Flag name cannot contain the character ":" */);

					expect(() => {
						typeFlag({ 'flag.d': String }, []);
					}).toThrow(/* Flag name cannot contain the character "." */);
				});

				test('Collision - camelCase to kebab-case', () => {
					expect(() => {
						typeFlag({
							flagA: String,
							'flag-a': String,
						}, []);
					}).toThrow(/* 'Invalid flag name "flagA": collides with flag "flag-a"' */);
				});

				test('Collision - kebab-case to camelCase', () => {
					expect(() => {
						typeFlag({
							'flag-a': String,
							flagA: String,
						}, []);
					}).toThrow(/* 'Invalid flag name "flag-a": collides with flag "flagA"' */);
				});
			});

			describe('Invalid alias', ({ test }) => {
				test('Empty alias', () => {
					expect(() => {
						typeFlag({
							flagA: {
								type: String,
								alias: '',
							},
						}, []);
					}).toThrow(/* 'Empty alias' */);
				});

				test('Multi-character alias', () => {
					expect(() => {
						typeFlag({
							flagA: {
								type: String,
								alias: 'flag-a',
							},
						}, []);
					}).toThrow(/* 'Multi character' */);
				});

				test('Collision - alias to alias', () => {
					expect(() => {
						typeFlag({
							flagA: {
								type: String,
								alias: 'a',
							},
							flagB: {
								type: String,
								alias: 'a',
							},
						}, []);
					}).toThrow(/* 'Flag collision: Alias "a" is already used' */);
				});
			});
		});

		describe('Types', ({ test }) => {
			test('Errors', () => {
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

			test('Readonly type', () => {
				typeFlag({
					flagA: {
						type: [String],
					},
				} as const, []);

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
						default: () => ['world'],
					},
				}, ['--flag-a', 'hello']);

				expect<string | undefined>(parsed.flags.flagA);
				expect<string[]>(parsed.flags.flagB);
			});
		});

		describe('Parsing', ({ describe, test }) => {
			describe('edge-cases', ({ test }) => {
				test('Object prototype property', () => {
					const parsed = typeFlag(
						{}, ['--to-string'],
					);
					expect(parsed.flags).toStrictEqual({});
					expect(parsed.unknownFlags).toStrictEqual({
						'to-string': [true],
					});
				});

				test('string to boolean', () => {
					const parsed = typeFlag({
						boolean: Boolean,
					}, ['--boolean=value']);

					expect(parsed.flags).toStrictEqual({
						boolean: true,
					});
				});

				test('end of flags', () => {
					const parsed = typeFlag({
						string: String,
					}, ['--string', '--', 'value']);

					expect(parsed.flags).toStrictEqual({
						string: '',
					});

					expect<string[]>(parsed._).toStrictEqual(
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

					expect(parsed.flags).toStrictEqual({
						_flag: true,
					});
				});

				test('invalid consolidated aliases', () => {
					const parsed = typeFlag(
						{}, ['-invalidAlias'],
					);

					expect(parsed).toStrictEqual({
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
				expect<string[]>(parsed._).toStrictEqual(
					Object.assign(
						['--flagB'],
						{
							'--': ['--flagB'],
						},
					),
				);
				expect(argv).toStrictEqual([]);
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
				expect<string[]>(parsed._).toStrictEqual(
					Object.assign(
						['world'],
						{ '--': [] },
					),
				);
				expect(argv).toStrictEqual([]);
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
				expect(argv).toStrictEqual([]);
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
				expect(argv).toStrictEqual([]);
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
				expect<string[]>(parsed._).toStrictEqual(
					Object.assign(
						['world'],
						{ '--': [] },
					),
				);
				expect(argv).toStrictEqual([]);
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
				expect(argv).toStrictEqual([]);
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
				expect(argv).toStrictEqual([]);
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
					expect(argv).toStrictEqual([]);
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
					expect(argv).toStrictEqual([]);
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
					expect(argv).toStrictEqual([]);
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
					[flag: string]: (boolean|string)[];
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
				expect(argv).toStrictEqual([]);
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

					expect(parsed).toStrictEqual({
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
					expect(argv).toStrictEqual(['--string', '--string=b']);
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

					expect(parsed).toStrictEqual({
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
					expect(argv).toStrictEqual(['--unknown', '--unknown=d', '-u', '-vv=1', '-u']);
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
							ignore(type) {
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

					expect(parsed).toStrictEqual({
						flags: {
							string: ['value'],
						},
						unknownFlags: {},
						_: Object.assign(
							[],
							{ '--': [] },
						),
					});
					expect(argv).toStrictEqual(['first-arg', '--string=b', '--string', 'c', '--unknown=d', '-u', '--', 'hello']);
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

					expect(parsed).toStrictEqual({
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
					expect(argv).toStrictEqual(['--', 'b', '--string=b', '--unknown', '--boolean']);
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
				expect(argv).toStrictEqual([]);
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
				expect(argv).toStrictEqual([]);
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
					expect(argv).toStrictEqual([]);
				});
			});
		});
	});
});
