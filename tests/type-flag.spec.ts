import typeFlag from '../src';

describe('Error handling', () => {
	test('Empty flag name', () => {
		expect(() => {
			typeFlag([], {
				'': String,
			});
		}).toThrow(/* 'Invalid flag name: empty' */);
	});

	test('Single character flag name', () => {
		expect(() => {
			typeFlag([], {
				i: String,
			});
		}).toThrow(/* 'Invalid flag name: single characters are reserved for aliases' */);
	});

	test('Multi-character alias', () => {
		expect(() => {
			typeFlag([], {
				flagA: {
					type: String,
					alias: 'flag-a',
				},
			});
		}).toThrow(/* 'Multi character' */);
	});

	test('Reserved characters', () => {
		expect(() => {
			typeFlag([], { 'flag a': String });
		}).toThrow(/* Flag name cannot contain the character " " */);

		expect(() => {
			typeFlag([], { 'flag=b': String });
		}).toThrow(/* Flag name cannot contain the character "=" */);

		expect(() => {
			typeFlag([], { 'flag:c': String });
		}).toThrow(/* Flag name cannot contain the character ":" */);

		expect(() => {
			typeFlag([], { 'flag.d': String });
		}).toThrow(/* Flag name cannot contain the character "." */);
	});

	test('Collision - camelCase to kebab-case', () => {
		expect(() => {
			typeFlag([], {
				flagA: String,
				'flag-a': String,
			});
		}).toThrow(/* 'Invalid flag name "flagA": collides with flag "flag-a"' */);
	});

	test('Collision - kebab-case to camelCase', () => {
		expect(() => {
			typeFlag([], {
				'flag-a': String,
				flagA: String,
			});
		}).toThrow(/* 'Invalid flag name "flag-a": collides with flag "flagA"' */);
	});

	test('Collision - alias to alias', () => {
		expect(() => {
			typeFlag([], {
				flagA: {
					type: String,
					alias: 'a',
				},
				flagB: {
					type: String,
					alias: 'a',
				},
			});
		}).toThrow(/* 'Flag collision: Alias "a" is already used' */);
	});

	test('Flag type', () => {
		typeFlag([], {
			// @ts-expect-error must be a function
			flagA: false,

			// @ts-expect-error only one element allowed
			flagB: [String, String],

			// @ts-expect-error only one element allowed
			flagC: {
				type: [String, String],
				alias: 'a',
			},
		});
	});
});

describe('Parsing', () => {
	test('invalid consolidated aliases', () => {
		const parsed = typeFlag(['-invalidAlias'], {});

		expect(parsed).toEqual({
			_: [],
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

	test('don\'t parse after --', () => {
		const parsed = typeFlag(['--flagA', '--', '--flagB'], {
			flagA: String,
			flagB: String,
		});

		expect<string | undefined>(parsed.flags.flagA).toEqual('');
		expect<string | undefined>(parsed.flags.flagB).toEqual(undefined);
		expect<string[]>(parsed._).toEqual(['--flagB']);
	});

	test('strings, booleans, numbers', () => {
		const parsed = typeFlag(['--string', 'hello', '--boolean', 'world', '--string', '--number', '2', '--number'], {
			string: String,
			boolean: Boolean,
			number: Number,
		});

		expect<string | undefined>(parsed.flags.string).toEqual('');
		expect<boolean | undefined>(parsed.flags.boolean).toEqual(true);
		expect<number | undefined>(parsed.flags.number).toEqual(Number.NaN);
		expect<string[]>(parsed._).toEqual(['world']);
	});

	test('convert kebab-case to camelCase', () => {
		const parsed = typeFlag(['--some-string=2', '--someString=3', '--some-string=4'], {
			someString: String,
		});

		expect<string | undefined>(parsed.flags.someString).toEqual('4');
	});

	test('flag=', () => {
		const parsed = typeFlag(['--string=hello', '-s=bye', '--string=', '--boolean=true', '--boolean=false', '--boolean=', 'world', '--number=3.14', '--number='], {
			string: {
				type: String,
				alias: 's',
			},
			boolean: Boolean,
			number: Number,
		});

		expect<string | undefined>(parsed.flags.string).toEqual('');
		expect<boolean | undefined>(parsed.flags.boolean).toEqual(true);
		expect<number | undefined>(parsed.flags.number).toEqual(Number.NaN);
		expect<string[]>(parsed._).toEqual(['world']);
	});

	test('flag: - to allow the use of = in values (or vice versa)', () => {
		const parsed = typeFlag(['--string:A=hello', '-s:B=bye'], {
			string: {
				type: String,
				alias: 's',
			},
		});

		expect<string | undefined>(parsed.flags.string).toEqual('B=bye');
	});

	test('flag: . to allow dot-notation', () => {
		const parsed = typeFlag(['--string.A=hello', '-s.B=bye'], {
			string: {
				type: String,
				alias: 's',
			},
		});

		expect<string | undefined>(parsed.flags.string).toEqual('B=bye');
	});

	test('aliases', () => {
		const parsed = typeFlag(['-s', 'hello', '-b', 'world', '-s'], {
			string: {
				type: String,
				alias: 's',
			},
			boolean: {
				type: Boolean,
				alias: 'b',
			},
		});

		expect<string | undefined>(parsed.flags.string).toEqual('');
		expect<boolean | undefined>(parsed.flags.boolean).toEqual(true);
		expect<string[]>(Object.keys(parsed.flags)).toEqual(['string', 'boolean']);
		expect<string[]>(parsed._).toEqual(['world']);
	});

	test('unknown flags', () => {
		const parsed = typeFlag(
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
			{},
		);

		expect<{
			[flag: string]: never;
		}>(parsed.flags).toEqual({});

		type UnknownFlags = {
			[flag: string]: (boolean|string)[];
		};

		expect<UnknownFlags>(parsed.unknownFlags).toEqual({
			unknownFlag: ['false', '', true],
			u: ['4', 'a'],
			3: [true],
			s: [true],
			d: [true],
			f: ['4', true, 'a'],
			unknownString: ['hello', true],
			'kebab-case': [true],
		});
		expect<string[]>(parsed._).toEqual(['a']);
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
			[
				'--date=2011-05-03',
				'--format=esm',
			],
			{
				date: ParseDate,
				format: JsFormat,
			},
		);

		expect<Date | undefined>(parsed.flags.date).toEqual(ParseDate('2011-05-03'));
		expect<JsFormats | undefined>(parsed.flags.format).toEqual('esm');
	});

	test('strings, booleans, numbers, array', () => {
		const parsed = typeFlag(['--boolean', 'world', '--number', '2', '--number', '--number-array', '1', '--number-array', '2', '--string-array', 'a', '--string-array', 'b'], {
			string: String,
			boolean: Boolean,
			number: Number,
			stringArray: [String],
			numberArray: {
				type: [Number],
			},
		});

		expect<string | undefined>(parsed.flags.string).toEqual(undefined);
		expect<boolean | undefined>(parsed.flags.boolean).toEqual(true);
		expect<number | undefined>(parsed.flags.number).toEqual(Number.NaN);
		expect<string[]>(parsed.flags.stringArray).toEqual(['a', 'b']);
		expect<number[]>(parsed.flags.numberArray).toEqual([1, 2]);
		expect<string[]>(parsed._).toEqual(['world']);
	});
});
