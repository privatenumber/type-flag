import typeFlag from '../src';

describe('Validation', () => {
	describe('Invalid flag', () => {
		test('Empty', () => {
			expect(() => {
				typeFlag([], {
					'': String,
				});
			}).toThrow(/* 'Invalid flag name: empty' */);
		});

		test('Single character flags', () => {
			expect(() => {
				typeFlag([], {
					i: String,
				});
			}).toThrow(/* 'Invalid flag name: single characters are reserved for aliases' */);
		});

		test('Multi-character aliases', () => {
			expect(() => {
				typeFlag([], {
					flagA: {
						type: String,
						alias: 'flag-a',
					},
				});
			}).toThrow(/* 'Multi character' */);
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

		expect<string[]>(parsed.flags.flagA).toEqual(['']);
		expect<string[]>(parsed.flags.flagB).toEqual([]);
		expect<string[]>(parsed._).toEqual(['--flagB']);
	});

	test('flag defaults to string', () => {
		const parsed = typeFlag(['--string', 'hello'], {
			string: {
				alias: 's',
			},
		});

		expect<string[]>(parsed.flags.string).toEqual(['hello']);
	});

	test('strings, booleans, numbers', () => {
		const parsed = typeFlag(['--string', 'hello', '--boolean', 'world', '--string', '--number', '2', '--number'], {
			string: String,
			boolean: Boolean,
			number: Number,
		});

		expect<string[]>(parsed.flags.string).toEqual(['hello', '']);
		expect<boolean[]>(parsed.flags.boolean).toEqual([true]);
		expect<number[]>(parsed.flags.number).toEqual([2, Number.NaN]);
		expect<string[]>(parsed._).toEqual(['world']);
	});

	test('convert kebab-case to camelCase', () => {
		const parsed = typeFlag(['--some-string=2', '--someString=3', '--some-string=4'], {
			someString: String,
		});

		expect<string[]>(parsed.flags.someString).toEqual(['2', '3', '4']);
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

		expect<string[]>(parsed.flags.string).toEqual(['hello', 'bye', '']);
		expect<boolean[]>(parsed.flags.boolean).toEqual([true, false, true]);
		expect<number[]>(parsed.flags.number).toEqual([3.14, Number.NaN]);
		expect<string[]>(parsed._).toEqual(['world']);
	});

	test('flag: - to allow the use of = in values (or vice versa)', () => {
		const parsed = typeFlag(['--string:A=hello', '-s:B=bye'], {
			string: {
				type: String,
				alias: 's',
			},
		});

		expect<string[]>(parsed.flags.string).toEqual(['A=hello', 'B=bye']);
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

		expect<string[]>(parsed.flags.string).toEqual(['hello', '']);
		expect<boolean[]>(parsed.flags.boolean).toEqual([true]);
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

		expect<Date[]>(parsed.flags.date).toEqual([
			ParseDate('2011-05-03'),
		]);
		expect<JsFormats[]>(parsed.flags.format).toEqual(['esm']);
	});
});
