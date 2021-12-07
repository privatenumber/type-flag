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

			// @ts-expect-error required can only be true
			requiredFalse: {
				type: Boolean,
				required: false,
			},

			requiredAndDefault: {
				type: String,
				required: true,

				// @ts-expect-error required & default are mutually exclusive
				default: '',
			},
		});
	});
});

describe('Parsing', () => {
	test('invalid consolidated aliases', () => {
		const parsed = typeFlag(['-invalidAlias'], {});

		expect(parsed).toStrictEqual({
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

		expect<string | undefined>(parsed.flags.flagA).toBe('');
		expect<string | undefined>(parsed.flags.flagB).toBe(undefined);
		expect<string[]>(parsed._).toStrictEqual(['--flagB']);
	});

	test('strings, booleans, numbers', () => {
		const parsed = typeFlag(['--string', 'hello', '--boolean', 'world', '--string', '--number', '2', '--number'], {
			string: String,
			boolean: Boolean,
			number: Number,
		});

		expect<string | undefined>(parsed.flags.string).toBe('');
		expect<boolean | undefined>(parsed.flags.boolean).toBe(true);
		expect<number | undefined>(parsed.flags.number).toBe(Number.NaN);
		expect<string[]>(parsed._).toStrictEqual(['world']);
	});

	test('convert kebab-case to camelCase', () => {
		const parsed = typeFlag(['--some-string=2', '--someString=3', '--some-string=4'], {
			someString: String,
		});

		expect<string | undefined>(parsed.flags.someString).toBe('4');
	});

	test('kebab-case flags', () => {
		const parsed = typeFlag(['--some-string=2', '--someString=3', '--some-string=4'], {
			'some-string': String,
		});

		expect<string | undefined>(parsed.flags['some-string']).toBe('4');
		expect(!('someString' in parsed.flags)).toBe(true);
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

		expect<string | undefined>(parsed.flags.string).toBe('');
		expect<boolean | undefined>(parsed.flags.boolean).toBe(true);
		expect<number | undefined>(parsed.flags.number).toBe(Number.NaN);
		expect<string[]>(parsed._).toStrictEqual(['world']);
	});

	test('flag: - to allow the use of = in values (or vice versa)', () => {
		const parsed = typeFlag(['--string:A=hello', '-s:B=bye'], {
			string: {
				type: String,
				alias: 's',
			},
		});

		expect<string | undefined>(parsed.flags.string).toBe('B=bye');
	});

	test('flag: . to allow dot-notation', () => {
		const parsed = typeFlag(['--string.A=hello', '-s.B=bye'], {
			string: {
				type: String,
				alias: 's',
			},
		});

		expect<string | undefined>(parsed.flags.string).toBe('B=bye');
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

		expect<string | undefined>(parsed.flags.string).toBe('');
		expect<boolean | undefined>(parsed.flags.boolean).toBe(true);
		expect<string[]>(Object.keys(parsed.flags)).toStrictEqual(['string', 'boolean']);
		expect<string[]>(parsed._).toStrictEqual(['world']);
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
		expect<string[]>(parsed._).toStrictEqual(['a']);
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

		expect<Date | undefined>(parsed.flags.date).toStrictEqual(ParseDate('2011-05-03'));
		expect<JsFormats | undefined>(parsed.flags.format).toBe('esm');
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

		expect<string | undefined>(parsed.flags.string).toBe(undefined);
		expect<boolean | undefined>(parsed.flags.boolean).toBe(true);
		expect<number | undefined>(parsed.flags.number).toBe(Number.NaN);
		expect<string[]>(parsed.flags.stringArray).toStrictEqual(['a', 'b']);
		expect<number[]>(parsed.flags.numberArray).toStrictEqual([1, 2]);
		expect<string[]>(parsed._).toStrictEqual(['world']);
	});

	describe('Required flag', () => {
		test('Types and parsing', () => {
			const parsed = typeFlag(['--string', 'hello', '--boolean', '--number', '1'], {
				string: {
					type: String,
					required: true,
				},
				boolean: {
					type: Boolean,
					required: true,
				},
				number: Number,
			});

			expect<string>(parsed.flags.string).toBe('hello');
			expect<boolean>(parsed.flags.boolean).toBe(true);
			expect<number | undefined>(parsed.flags.number).toBe(1);
		});

		test('Throw on missing', () => {
			expect(() => {
				typeFlag([], {
					flagA: {
						type: String,
						required: true,
					},
				});
			}).toThrow(/* 'Missing required option "--flagA"' */);

			expect(() => {
				typeFlag([], {
					flagA: {
						type: [String],
						required: true,
					},
				});
			}).toThrow(/* 'Missing required option "--flagA"' */);
		});
	});

	describe('Default flag value', () => {
		test('Types and parsing', () => {
			const parsed = typeFlag([], {
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
			});

			expect<string>(parsed.flags.string).toBe('hello world');
			expect<boolean | number>(parsed.flags.inconsistentTypes).toBe(1);
			expect<boolean | undefined>(parsed.flags.inconsistentTypesB).toBe(undefined);
			expect<string[]>(parsed.flags.arrayOfStrings).toStrictEqual(['hello']);
		});
	});
});
