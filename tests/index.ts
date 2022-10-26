import { describe, expect } from 'manten';
import typeFlag, { type Flags } from '#type-flag';

describe('Error handling', ({ describe, test }) => {
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

	test('Missing required type', () => {
		expect(() => {
			typeFlag({
				// @ts-expect-error missing
				missingType: {
					alias: 't',
				},

			}, ['--missing-type']);
		}).toThrow('Missing type on flag "missingType"');
	});
});

describe('Types', ({ test }) => {
	test('Errors', () => {
		typeFlag({
			// @ts-expect-error must be a function
			flagA: false,

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
	test('invalid consolidated aliases', () => {
		const parsed = typeFlag({}, ['-invalidAlias']);

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

	test('end of flags', () => {
		const parsed = typeFlag({
			flagA: String,
			flagB: String,
		}, ['--flagA', '--', '--flagB']);

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
	});

	test('strings, booleans, numbers', () => {
		const parsed = typeFlag({
			string: String,
			boolean: Boolean,
			number: Number,
		}, ['--string', 'hello', '--boolean', 'world', '--string', '--number', '2', '--number']);

		expect<string | undefined>(parsed.flags.string).toBe('');
		expect<boolean | undefined>(parsed.flags.boolean).toBe(true);
		expect<number | undefined>(parsed.flags.number).toBe(Number.NaN);
		expect<string[]>(parsed._).toStrictEqual(
			Object.assign(
				['world'],
				{ '--': [] },
			),
		);
	});

	test('convert kebab-case to camelCase', () => {
		const parsed = typeFlag({
			someString: String,
		}, ['--some-string=2', '--someString=3', '--some-string=4']);

		expect<string | undefined>(parsed.flags.someString).toBe('4');
	});

	test('kebab-case flags', () => {
		const parsed = typeFlag({
			'some-string': String,
		}, ['--some-string=2', '--someString=3', '--some-string=4']);

		expect<string | undefined>(parsed.flags['some-string']).toBe('4');
		expect(!('someString' in parsed.flags)).toBe(true);
	});

	test('flag=', () => {
		const parsed = typeFlag({
			string: {
				type: String,
				alias: 's',
			},
			boolean: Boolean,
			number: Number,
		}, ['--string=hello', '-s=bye', '--string=', '--boolean=true', '--boolean=false', '--boolean=', 'world', '--number=3.14', '--number=']);

		expect<string | undefined>(parsed.flags.string).toBe('');
		expect<boolean | undefined>(parsed.flags.boolean).toBe(true);
		expect<number | undefined>(parsed.flags.number).toBe(Number.NaN);
		expect<string[]>(parsed._).toStrictEqual(
			Object.assign(
				['world'],
				{ '--': [] },
			),
		);
	});

	test('flag: - to allow the use of = in values (or vice versa)', () => {
		const parsed = typeFlag({
			string: {
				type: String,
				alias: 's',
			},
		}, ['--string:A=hello', '-s:B=bye']);

		expect<string | undefined>(parsed.flags.string).toBe('B=bye');
	});

	test('flag: . to allow dot-notation', () => {
		const parsed = typeFlag({
			string: {
				type: String,
				alias: 's',
			},
		}, ['--string.A=hello', '-s.B=bye']);

		expect<string | undefined>(parsed.flags.string).toBe('B=bye');
	});

	test('aliases', () => {
		const parsed = typeFlag({
			string: {
				type: String,
				alias: 's',
			},
			boolean: {
				type: Boolean,
				alias: 'b',
			},
		}, ['-s', 'hello', '-b', 'world', '-s']);

		expect<string | undefined>(parsed.flags.string).toBe('');
		expect<boolean | undefined>(parsed.flags.boolean).toBe(true);
		expect<string[]>(Object.keys(parsed.flags)).toStrictEqual(['string', 'boolean']);
		expect<string[]>(parsed._).toStrictEqual(
			Object.assign(
				['world'],
				{ '--': [] },
			),
		);
	});

	test('unknown flags', () => {
		const parsed = typeFlag(
			{},
			[
				'--unknownFlag=false',
				'--unknownFlag=',
				'a',
				'--unknownFlag',
				'-u',
				'4',
				'-u=a',
				'--unknownString',
				'hello',
				'--unknownString',
				'-3',
				'-sdf',
				'4',
				'-ff=a',
				'--kebab-case',
			],
		);

		expect<{
			[flag: string]: never;
		}>(parsed.flags).toStrictEqual({});

		type UnknownFlags = {
			[flag: string]: (boolean|string)[];
		};

		expect<UnknownFlags>(parsed.unknownFlags).toStrictEqual({
			unknownFlag: ['false', '', true],
			u: ['4', 'a'],
			3: [true],
			s: [true],
			d: [true],
			f: ['4', true, 'a'],
			unknownString: ['hello', true],
			'kebab-case': [true],
		});
		expect<string[]>(parsed._).toStrictEqual(
			Object.assign(
				['a'],
				{ '--': [] },
			),
		);
	});

	test('ignore unknown flags', () => {
		const parsed = typeFlag(
			{
				string: [String],
			},
			['--string', 'a', '--string=b', '--unknown', 'c', '--unknown=d', '-u'],
			{ ignoreUnknown: true },
		);

		expect(parsed).toStrictEqual({
			flags: {
				string: ['a', 'b'],
			},
			unknownFlags: {},
			_: Object.assign(['--unknown', 'c', '--unknown=d', '-u'], {
				'--': [],
			}),
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

		const parsed = typeFlag(
			{
				date: ParseDate,
				format: JsFormat,
			},
			[
				'--date=2011-05-03',
				'--format=esm',
			],
		);

		expect<Date | undefined>(parsed.flags.date).toStrictEqual(ParseDate('2011-05-03'));
		expect<JsFormats | undefined>(parsed.flags.format).toBe('esm');
	});

	test('strings, booleans, numbers, array', () => {
		const parsed = typeFlag({
			string: String,
			boolean: Boolean,
			number: Number,
			stringArray: [String],
			numberArray: {
				type: [Number],
			},
		}, ['--boolean', 'world', '--number', '2', '--number', '--number-array', '1', '--number-array', '2', '--string-array', 'a', '--string-array', 'b']);

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
	});

	describe('Default flag value', ({ test }) => {
		test('Types and parsing', () => {
			const parsed = typeFlag({
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
			}, []);

			expect<string>(parsed.flags.string).toBe('hello world');
			expect<boolean | number>(parsed.flags.inconsistentTypes).toBe(1);
			expect<boolean | undefined>(parsed.flags.inconsistentTypesB).toBe(undefined);
			expect<string[]>(parsed.flags.arrayOfStrings).toStrictEqual(['hello']);
			expect<string | number>(parsed.flags.inconsistentTypesC).toBe('world');
		});
	});
});
