import { describe, test, expect } from 'manten';
import { typeFlag } from '#type-flag';
import { createPositionalArguments } from '#type-flag/internal';

describe('Parsing', () => {
	describe('edge-cases', () => {
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
			const argv = ['--number', '-123'];
			const parsed = typeFlag({
				number: Number,
			}, argv);

			// -123 is consumed as the value for --number
			expect<{ number?: number }>(parsed.flags).toStrictEqual({
				number: -123,
			});
			expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({});
			expect<string[] & { '--': string[] }>(parsed._).toStrictEqual(
				Object.assign(
					[],
					{ '--': [] },
				),
			);
			expect<string[]>(argv).toStrictEqual([]);
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

			expect<string[] & { '--': string[] }>(parsed._).toStrictEqual(Object.assign([], { '--': [] }));
			expect<Record<PropertyKey, never>>(parsed.flags).toStrictEqual({});
			expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({
				i: [true, true, true],
				n: [true],
				v: [true],
				a: [true, true],
				l: [true, true],
				d: [true],
				A: [true],
				s: [true],
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

	describe('negative number values', () => {
		test('consumes negative integer', () => {
			const argv = ['--retry', '-5'];
			const parsed = typeFlag({ retry: Number }, argv);

			expect<{ retry?: number }>(parsed.flags).toStrictEqual({ retry: -5 });
			expect(parsed.unknownFlags).toStrictEqual({});
			expect<string[]>(argv).toStrictEqual([]);
		});

		test('consumes negative decimal', () => {
			const parsed = typeFlag({ retry: Number }, ['--retry', '-5.5']);

			expect<{ retry?: number }>(parsed.flags).toStrictEqual({ retry: -5.5 });
		});

		test('consumes negative scientific notation', () => {
			const parsed = typeFlag({ retry: Number }, ['--retry', '-5e3']);

			expect<{ retry?: number }>(parsed.flags).toStrictEqual({ retry: -5000 });
		});

		test('consumes negative via alias', () => {
			const parsed = typeFlag({
				retry: {
					type: Number,
					alias: 'r',
				},
			}, ['-r', '-5']);

			expect<{ retry?: number }>(parsed.flags).toStrictEqual({ retry: -5 });
		});

		test('explicit = value still works', () => {
			const parsed = typeFlag({ retry: Number }, ['--retry=-5']);

			expect<{ retry?: number }>(parsed.flags).toStrictEqual({ retry: -5 });
		});

		test('string flag consumes negative-number token', () => {
			const parsed = typeFlag({ name: String }, ['--name', '-5']);

			expect<{ name?: string }>(parsed.flags).toStrictEqual({ name: '-5' });
		});

		test('array of numbers consumes negatives', () => {
			const parsed = typeFlag({ nums: [Number] }, ['--nums', '-1', '--nums', '-2']);

			expect<{ nums: number[] }>(parsed.flags).toStrictEqual({ nums: [-1, -2] });
		});

		describe('defined flags take precedence', () => {
			test('-5 resolves to the defined flag, not a value', () => {
				const parsed = typeFlag({
					retry: Number,
					fast: {
						type: Boolean,
						alias: '5',
					},
					name: {
						type: String,
						alias: 'n',
					},
				}, ['--retry', '-5']);

				expect(parsed.flags).toStrictEqual({
					retry: Number.NaN,
					fast: true,
					name: undefined,
				});
				expect(parsed.unknownFlags).toStrictEqual({});
			});

			test('-5 then -n value', () => {
				const parsed = typeFlag({
					retry: Number,
					fast: {
						type: Boolean,
						alias: '5',
					},
					name: {
						type: String,
						alias: 'n',
					},
				}, ['--retry', '-5', '-n', 'Hiroki']);

				expect(parsed.flags).toStrictEqual({
					retry: Number.NaN,
					fast: true,
					name: 'Hiroki',
				});
			});

			test('alias group -5n', () => {
				const parsed = typeFlag({
					retry: Number,
					fast: {
						type: Boolean,
						alias: '5',
					},
					name: {
						type: String,
						alias: 'n',
					},
				}, ['--retry', '-5n', 'Hiroki']);

				expect(parsed.flags).toStrictEqual({
					retry: Number.NaN,
					fast: true,
					name: 'Hiroki',
				});
			});

			test('partial match -50 is a number', () => {
				const parsed = typeFlag({
					retry: Number,
					fast: {
						type: Boolean,
						alias: '5',
					},
					name: {
						type: String,
						alias: 'n',
					},
				}, ['--retry', '-50']);

				expect(parsed.flags).toStrictEqual({
					retry: -50,
					fast: undefined,
					name: undefined,
				});
			});

			test('decimal -5.5 is a number even when 5 is a flag', () => {
				const parsed = typeFlag({
					retry: Number,
					fast: {
						type: Boolean,
						alias: '5',
					},
					name: {
						type: String,
						alias: 'n',
					},
				}, ['--retry', '-5.5']);

				expect(parsed.flags).toStrictEqual({
					retry: -5.5,
					fast: undefined,
					name: undefined,
				});
			});

			test('all-digit alias group -512', () => {
				const parsed = typeFlag({
					retry: Number,
					alpha: {
						type: Boolean,
						alias: '5',
					},
					beta: {
						type: Boolean,
						alias: '1',
					},
					gamma: {
						type: Boolean,
						alias: '2',
					},
				}, ['--retry', '-512']);

				expect(parsed.flags).toStrictEqual({
					retry: Number.NaN,
					alpha: true,
					beta: true,
					gamma: true,
				});
			});
		});

		describe('coexists with numeric flags', () => {
			test('unregistered negative is a value', () => {
				const parsed = typeFlag({
					retry: Number,
					one: {
						type: Boolean,
						alias: '1',
					},
				}, ['--retry', '-5']);

				expect(parsed.flags).toStrictEqual({
					retry: -5,
					one: undefined,
				});
			});

			test('registered -1 standalone is the flag', () => {
				const parsed = typeFlag({
					retry: Number,
					one: {
						type: Boolean,
						alias: '1',
					},
				}, ['-1']);

				expect(parsed.flags).toStrictEqual({
					retry: undefined,
					one: true,
				});
			});

			test('value and flag in one command', () => {
				const parsed = typeFlag({
					retry: Number,
					one: {
						type: Boolean,
						alias: '1',
					},
				}, ['-1', '--retry', '-5']);

				expect(parsed.flags).toStrictEqual({
					retry: -5,
					one: true,
				});
			});

			test('registered -1 wins after a value flag', () => {
				const parsed = typeFlag({
					retry: Number,
					one: {
						type: Boolean,
						alias: '1',
					},
				}, ['--retry', '-1']);

				expect(parsed.flags).toStrictEqual({
					retry: Number.NaN,
					one: true,
				});
			});
		});

		describe('value-slot only', () => {
			test('standalone negative is an unknown flag', () => {
				const parsed = typeFlag({ retry: Number }, ['-7']);

				expect(parsed.flags).toStrictEqual({ retry: undefined });
				expect(parsed.unknownFlags).toStrictEqual({ 7: [true] });
			});

			test('boolean flag does not consume a following negative', () => {
				const parsed = typeFlag({ verbose: Boolean }, ['--verbose', '-5']);

				expect(parsed.flags).toStrictEqual({ verbose: true });
				expect(parsed.unknownFlags).toStrictEqual({ 5: [true] });
			});

			test('array consumes one value; trailing negative is an unknown flag', () => {
				const parsed = typeFlag({ nums: [Number] }, ['--nums', '-1', '-2']);

				expect(parsed.flags).toStrictEqual({ nums: [-1] });
				expect(parsed.unknownFlags).toStrictEqual({ 2: [true] });
			});
		});

		test('end of flags wins over value consumption', () => {
			const argv = ['--retry', '--', '-5'];
			const parsed = typeFlag({ retry: Number }, argv);

			expect<{ retry?: number }>(parsed.flags).toStrictEqual({ retry: Number.NaN });
			expect<string[] & { '--': string[] }>(parsed._).toStrictEqual(
				Object.assign(['-5'], { '--': ['-5'] }),
			);
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

	describe('createPositionalArguments', () => {
		test('returns arguments without a double-dash delimiter', () => {
			const argv = ['one', 'two'];
			const parsed = createPositionalArguments(argv);

			expect(parsed).toStrictEqual(
				Object.assign(
					['one', 'two'],
					{ '--': [] },
				),
			);
			expect(Object.prototype.propertyIsEnumerable.call(parsed, '--')).toBe(true);
			expect(argv).toStrictEqual(['one', 'two']);
		});

		test('moves post-delimiter arguments into the double-dash property', () => {
			const argv = ['one', '--', 'two'];
			const parsed = createPositionalArguments(argv);

			expect(parsed).toStrictEqual(
				Object.assign(
					['one', 'two'],
					{ '--': ['two'] },
				),
			);
			expect(parsed.slice()).toStrictEqual(['one', 'two']);
			expect(parsed['--']).toStrictEqual(['two']);
			expect(argv).toStrictEqual(['one', '--', 'two']);
		});

		test('treats only the first double-dash as the delimiter', () => {
			const parsed = createPositionalArguments(['one', '--', 'two', '--', 'three']);

			expect(parsed).toStrictEqual(
				Object.assign(
					['one', 'two', '--', 'three'],
					{ '--': ['two', '--', 'three'] },
				),
			);
		});

		test('supports empty argv', () => {
			const parsed = createPositionalArguments([]);

			expect(parsed).toStrictEqual(
				Object.assign(
					[],
					{ '--': [] },
				),
			);
		});

		test('matches typeFlag positional output', () => {
			const argvCases = [
				[],
				['one', 'two'],
				['one', '--', 'two'],
				['one', '--', 'two', '--', 'three'],
			];

			for (const argv of argvCases) {
				expect(createPositionalArguments(argv)).toStrictEqual(typeFlag({}, [...argv])._);
			}
		});

		test('rebuilds positionals from an ignored command tail', () => {
			const argv = ['--verbose', 'typo', '--', 'after'];
			let preserveTail = false;

			const parsed = typeFlag(
				{
					verbose: Boolean,
				},
				argv,
				{
					ignore: (type) => {
						if (preserveTail) {
							return true;
						}

						if (type === 'argument') {
							preserveTail = true;
							return true;
						}
					},
				},
			);

			expect<boolean | undefined>(parsed.flags.verbose).toBe(true);
			expect(argv).toStrictEqual(['typo', '--', 'after']);
			expect(createPositionalArguments(argv)).toStrictEqual(
				Object.assign(
					['typo', 'after'],
					{ '--': ['after'] },
				),
			);
		});
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
		// -Infinity has no leading digit, so it still needs the = delimiter
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

	test('acronyms in camelCase convert to kebab-case correctly', () => {
		// getID should accept --get-id, not --get-i-d
		const argv1 = ['--get-id=123'];
		const parsed1 = typeFlag({ getID: String }, argv1);
		expect<string | undefined>(parsed1.flags.getID).toBe('123');
		expect<string[]>(argv1).toStrictEqual([]);

		// parseURL should accept --parse-url, not --parse-u-r-l
		const argv2 = ['--parse-url=https://example.com'];
		const parsed2 = typeFlag({ parseURL: String }, argv2);
		expect<string | undefined>(parsed2.flags.parseURL).toBe('https://example.com');
		expect<string[]>(argv2).toStrictEqual([]);

		// XMLParser should accept --xml-parser
		const argv3 = ['--xml-parser=true'];
		const parsed3 = typeFlag({ XMLParser: Boolean }, argv3);
		expect<boolean | undefined>(parsed3.flags.XMLParser).toBe(true);
		expect<string[]>(argv3).toStrictEqual([]);

		// getIDNumber should accept --get-id-number
		const argv4 = ['--get-id-number=456'];
		const parsed4 = typeFlag({ getIDNumber: Number }, argv4);
		expect<number | undefined>(parsed4.flags.getIDNumber).toBe(456);
		expect<string[]>(argv4).toStrictEqual([]);

		// someAPIKey should accept --some-api-key
		const argv5 = ['--some-api-key=secret'];
		const parsed5 = typeFlag({ someAPIKey: String }, argv5);
		expect<string | undefined>(parsed5.flags.someAPIKey).toBe('secret');
		expect<string[]>(argv5).toStrictEqual([]);
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

	describe('single-character flag names', () => {
		test('parses string value', () => {
			const parsed = typeFlag({ x: String }, ['-x', 'hello']);
			expect<string | undefined>(parsed.flags.x).toBe('hello');
		});

		test('parses boolean value', () => {
			const parsed = typeFlag({ v: Boolean }, ['-v']);
			expect<boolean | undefined>(parsed.flags.v).toBe(true);
		});

		test('groups with multi-char flag alias', () => {
			const parsed = typeFlag(
				{
					a: Boolean,
					message: {
						type: String,
						alias: 'm',
					},
				},
				['-am', 'hello'],
			);
			expect<boolean | undefined>(parsed.flags.a).toBe(true);
			expect<string | undefined>(parsed.flags.message).toBe('hello');
		});

		test('-h sets only single-char flag', () => {
			const parsed = typeFlag({
				h: Boolean,
				help: Boolean,
			}, ['-h']);
			expect<boolean | undefined>(parsed.flags.h).toBe(true);
			expect<boolean | undefined>(parsed.flags.help).toBe(undefined);
		});

		test('--help sets only long flag', () => {
			const parsed = typeFlag({
				h: Boolean,
				help: Boolean,
			}, ['--help']);
			expect<boolean | undefined>(parsed.flags.h).toBe(undefined);
			expect<boolean | undefined>(parsed.flags.help).toBe(true);
		});

		test('both flags distinguishable', () => {
			const parsed = typeFlag({
				h: Boolean,
				help: Boolean,
			}, ['-h', '--help']);
			expect<boolean | undefined>(parsed.flags.h).toBe(true);
			expect<boolean | undefined>(parsed.flags.help).toBe(true);
		});

		test('--h does not match single-char flag', () => {
			const parsed = typeFlag({
				h: Boolean,
				help: Boolean,
			}, ['--h']);
			expect<boolean | undefined>(parsed.flags.h).toBe(undefined);
			expect<boolean | undefined>(parsed.flags.help).toBe(undefined);
			expect(parsed.unknownFlags.h).toStrictEqual([true]);
		});

		test('uppercase single-char flag', () => {
			const parsed = typeFlag({ X: String }, ['-X', 'hi']);
			expect<string | undefined>(parsed.flags.X).toBe('hi');
		});

		test('inline value with = delimiter', () => {
			const parsed = typeFlag({ x: String }, ['-x=hello']);
			expect<string | undefined>(parsed.flags.x).toBe('hello');
		});

		test('array type collects repeated flags', () => {
			const parsed = typeFlag({ x: [Number] }, ['-x', '1', '-x', '2']);
			expect<number[]>(parsed.flags.x).toStrictEqual([1, 2]);
		});

		test('unknown single-char goes to unknownFlags', () => {
			const parsed = typeFlag({ x: String }, ['-z', 'foo']);
			expect<string | undefined>(parsed.flags.x).toBe(undefined);
			expect(parsed.unknownFlags.z).toStrictEqual([true]);
			expect(parsed._).toStrictEqual(Object.assign(['foo'], { '--': [] }));
		});

		test('booleanNegation --no-x matches single-char flag', () => {
			const parsed = typeFlag({ x: Boolean }, ['--no-x'], { booleanNegation: true });
			expect<boolean | undefined>(parsed.flags.x).toBe(false);
		});

		test('groups two single-char boolean names', () => {
			const parsed = typeFlag({
				a: Boolean,
				b: Boolean,
			}, ['-ab']);
			expect<boolean | undefined>(parsed.flags.a).toBe(true);
			expect<boolean | undefined>(parsed.flags.b).toBe(true);
			expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({});
		});

		test('groups three single-char boolean names', () => {
			const parsed = typeFlag({
				a: Boolean,
				b: Boolean,
				c: Boolean,
			}, ['-abc']);
			expect<boolean | undefined>(parsed.flags.a).toBe(true);
			expect<boolean | undefined>(parsed.flags.b).toBe(true);
			expect<boolean | undefined>(parsed.flags.c).toBe(true);
			expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({});
		});

		test('last char in group takes next-arg value', () => {
			const parsed = typeFlag({
				a: Boolean,
				x: String,
			}, ['-ax', 'hello']);
			expect<boolean | undefined>(parsed.flags.a).toBe(true);
			expect<string | undefined>(parsed.flags.x).toBe('hello');
		});

		test('last char in group takes inline = value', () => {
			const parsed = typeFlag({
				a: Boolean,
				x: String,
			}, ['-ax=hello']);
			expect<boolean | undefined>(parsed.flags.a).toBe(true);
			expect<string | undefined>(parsed.flags.x).toBe('hello');
		});

		test('unknown char in group goes to unknownFlags, known chars still set', () => {
			const parsed = typeFlag({ a: Boolean }, ['-ab']);
			expect<boolean | undefined>(parsed.flags.a).toBe(true);
			expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({
				b: [true],
			});
		});

		test('group mixes single-char name, alias, and value-taking flag', () => {
			const parsed = typeFlag(
				{
					a: Boolean,
					verbose: {
						type: Boolean,
						alias: 'v',
					},
					x: String,
				},
				['-avx', 'hi'],
			);
			expect<boolean | undefined>(parsed.flags.a).toBe(true);
			expect<boolean | undefined>(parsed.flags.verbose).toBe(true);
			expect<string | undefined>(parsed.flags.x).toBe('hi');
		});
	});

	describe('aliases', () => {
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

	describe('ignore', () => {
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

			expect<{ string: string[] }>(parsed.flags).toStrictEqual({
				string: [],
			});
			expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({
				unknown: [true, 'd'],
				u: [true],
				v: [true, true, '1'],
			});
			expect<string[] & { '--': string[] }>(parsed._).toStrictEqual(Object.assign(
				['a', 'c'],
				{ '--': [] },
			));
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

			expect<{ string: string[];
				boolean: boolean | undefined; }>(parsed.flags).toStrictEqual({
				string: ['a', 'b', 'd'],
				boolean: true,
			});
			expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({});
			expect<string[] & { '--': string[] }>(parsed._).toStrictEqual(Object.assign(
				['c'],
				{ '--': [] },
			));
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

			expect<{ string: string[] }>(parsed.flags).toStrictEqual({
				string: ['value'],
			});
			expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({});
			expect<string[] & { '--': string[] }>(parsed._).toStrictEqual(Object.assign(
				[],
				{ '--': [] },
			));
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

			expect<{ string: string | undefined;
				boolean: boolean | undefined; }>(parsed.flags).toStrictEqual({
				string: 'hello',
				boolean: undefined,
			});
			expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({});
			expect<string[] & { '--': string[] }>(parsed._).toStrictEqual(Object.assign(
				['a'],
				{ '--': [] },
			));
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

	describe('booleanNegation', () => {
		const negation = { booleanNegation: true };

		test('basic negation', () => {
			const parsed = typeFlag({
				verbose: Boolean,
			}, ['--no-verbose'], negation);

			expect<boolean | undefined>(parsed.flags.verbose).toBe(false);
		});

		test('last-wins: --verbose then --no-verbose', () => {
			const parsed = typeFlag({
				verbose: Boolean,
			}, ['--verbose', '--no-verbose'], negation);

			expect<boolean | undefined>(parsed.flags.verbose).toBe(false);
		});

		test('last-wins: --no-verbose then --verbose', () => {
			const parsed = typeFlag({
				verbose: Boolean,
			}, ['--no-verbose', '--verbose'], negation);

			expect<boolean | undefined>(parsed.flags.verbose).toBe(true);
		});

		test('array boolean', () => {
			const parsed = typeFlag({
				verbose: [Boolean],
			}, ['--no-verbose', '--verbose'], negation);

			expect<boolean[]>(parsed.flags.verbose).toStrictEqual([false, true]);
		});

		test('only affects boolean flags', () => {
			const parsed = typeFlag({
				verbose: Boolean,
				count: Number,
			}, ['--no-verbose', '--no-count'], negation);

			expect<boolean | undefined>(parsed.flags.verbose).toBe(false);
			expect<number | undefined>(parsed.flags.count).toBe(undefined);
			expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({
				'no-count': [true],
			});
		});

		test('kebab-case negation', () => {
			const parsed = typeFlag({
				someFlag: Boolean,
			}, ['--no-some-flag'], negation);

			expect<boolean | undefined>(parsed.flags.someFlag).toBe(false);
		});

		test('argv mutation', () => {
			const argv = ['--no-verbose', 'arg'];
			const parsed = typeFlag({
				verbose: Boolean,
			}, argv, negation);

			expect<boolean | undefined>(parsed.flags.verbose).toBe(false);
			expect<string[]>(argv).toStrictEqual([]);
		});

		test('explicit value is ignored for negation', () => {
			const parsed = typeFlag({
				verbose: Boolean,
			}, ['--no-verbose=true'], negation);

			expect<boolean | undefined>(parsed.flags.verbose).toBe(false);
		});

		test('schema with alias and default', () => {
			const parsed = typeFlag({
				verbose: {
					type: Boolean,
					alias: 'v',
					default: true,
				},
			}, ['--no-verbose'], negation);

			expect<boolean>(parsed.flags.verbose).toBe(false);
		});

		test('no-prefixed flags do not appear in output', () => {
			const parsed = typeFlag({
				verbose: Boolean,
			}, ['--no-verbose'], negation);

			expect(Object.keys(parsed.flags)).toStrictEqual(['verbose']);
		});

		test('ignore callback receives no- prefixed name as known-flag', () => {
			const ignoredFlags: [string, string][] = [];
			typeFlag(
				{
					verbose: Boolean,
				},
				['--no-verbose', '--no-unknown'],
				{
					booleanNegation: true,
					ignore: (type, flagName) => {
						ignoredFlags.push([type, flagName]);
						return false;
					},
				},
			);

			expect(ignoredFlags).toStrictEqual([
				['known-flag', 'no-verbose'],
				['unknown-flag', 'no-unknown'],
			]);
		});

		test('explicit noFlagName schema takes precedence over negation', () => {
			const parsed = typeFlag({
				asdf: Boolean,
				noAsdf: String,
			}, ['--no-asdf', 'hello'], negation);

			expect<string | undefined>(parsed.flags.noAsdf).toBe('hello');
			expect<boolean | undefined>(parsed.flags.asdf).toBe(undefined);
		});

		test('noPrefix boolean flag is treated as known flag, not negation', () => {
			const parsed = typeFlag({
				noCache: Boolean,
			}, ['--no-cache'], negation);

			expect<boolean | undefined>(parsed.flags.noCache).toBe(true);
		});

		test('disabled by default', () => {
			const parsed = typeFlag({
				verbose: Boolean,
			}, ['--no-verbose']);

			expect<boolean | undefined>(parsed.flags.verbose).toBe(undefined);
			expect<Record<string, (string | boolean)[]>>(parsed.unknownFlags).toStrictEqual({
				'no-verbose': [true],
			});
		});
	});

	describe('Default flag value', () => {
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

	describe('consumed', () => {
		test('preserves order across different flags', () => {
			const parsed = typeFlag(
				{
					data: {
						type: [String],
						alias: 'd',
					},
					dataUrlencode: [String],
				},
				['-d', 'a=1', '--data-urlencode', 'b=2', '-d', 'c=3'],
			);

			// `flags` groups by name, losing the interleaving...
			expect(parsed.flags).toStrictEqual({
				data: ['a=1', 'c=3'],
				dataUrlencode: ['b=2'],
			});

			// ...but `consumed` preserves the command-line order.
			expect(parsed.consumed).toStrictEqual([
				{
					type: 'known-flag',
					name: 'data',
					value: 'a=1',
				},
				{
					type: 'known-flag',
					name: 'dataUrlencode',
					value: 'b=2',
				},
				{
					type: 'known-flag',
					name: 'data',
					value: 'c=3',
				},
			]);
		});

		test('uses the canonical schema name for alias and kebab-case input', () => {
			const parsed = typeFlag(
				{
					dataUrlencode: {
						type: [String],
						alias: 'd',
					},
				},
				['-d', 'a', '--data-urlencode', 'b', '--dataUrlencode', 'c'],
			);

			expect(parsed.consumed).toStrictEqual([
				{
					type: 'known-flag',
					name: 'dataUrlencode',
					value: 'a',
				},
				{
					type: 'known-flag',
					name: 'dataUrlencode',
					value: 'b',
				},
				{
					type: 'known-flag',
					name: 'dataUrlencode',
					value: 'c',
				},
			]);
		});

		test('parses values and applies the type function', () => {
			const parsed = typeFlag(
				{
					port: [Number],
					verbose: Boolean,
				},
				['--port', '3000', '--verbose', '--port=3001'],
			);

			expect(parsed.consumed).toStrictEqual([
				{
					type: 'known-flag',
					name: 'port',
					value: 3000,
				},
				{
					type: 'known-flag',
					name: 'verbose',
					value: true,
				},
				{
					type: 'known-flag',
					name: 'port',
					value: 3001,
				},
			]);
		});

		test('includes every occurrence of a scalar flag (last wins in flags)', () => {
			const parsed = typeFlag(
				{ name: String },
				['--name', 'a', '--name', 'b'],
			);

			expect(parsed.flags.name).toBe('b');
			expect(parsed.consumed).toStrictEqual([
				{
					type: 'known-flag',
					name: 'name',
					value: 'a',
				},
				{
					type: 'known-flag',
					name: 'name',
					value: 'b',
				},
			]);
		});

		test('records unknown flags and positionals in order', () => {
			const parsed = typeFlag(
				{ verbose: Boolean },
				['file.txt', '--verbose', '--unknown=x', 'other.txt'],
			);

			expect(parsed.consumed).toStrictEqual([
				{
					type: 'argument',
					value: 'file.txt',
				},
				{
					type: 'known-flag',
					name: 'verbose',
					value: true,
				},
				{
					type: 'unknown-flag',
					name: 'unknown',
					value: 'x',
				},
				{
					type: 'argument',
					value: 'other.txt',
				},
			]);
		});

		test('flags arguments after the double-dash delimiter', () => {
			const parsed = typeFlag(
				{ verbose: Boolean },
				['a', '--verbose', '--', 'b', 'c'],
			);

			expect(parsed.consumed).toStrictEqual([
				{
					type: 'argument',
					value: 'a',
				},
				{
					type: 'known-flag',
					name: 'verbose',
					value: true,
				},
				{
					type: 'argument',
					value: 'b',
					afterDoubleDash: true,
				},
				{
					type: 'argument',
					value: 'c',
					afterDoubleDash: true,
				},
			]);
		});

		test('records boolean negation as the canonical flag set to false', () => {
			const parsed = typeFlag(
				{ cache: Boolean },
				['--cache', '--no-cache'],
				{ booleanNegation: true },
			);

			expect(parsed.flags.cache).toBe(false);
			expect(parsed.consumed).toStrictEqual([
				{
					type: 'known-flag',
					name: 'cache',
					value: true,
				},
				{
					type: 'known-flag',
					name: 'cache',
					value: false,
				},
			]);
		});

		test('excludes elements skipped by the ignore callback', () => {
			const parsed = typeFlag(
				{
					string: [String],
					verbose: Boolean,
				},
				['--string', 'a', '--verbose', '--string', 'b'],
				{
					ignore: (type, flagName) => type === 'known-flag' && flagName === 'string',
				},
			);

			// An ignored flag never consumes a following value, so `a`/`b` fall
			// through as positional arguments — and `consumed` reflects exactly that.
			expect(parsed.consumed).toStrictEqual([
				{
					type: 'argument',
					value: 'a',
				},
				{
					type: 'known-flag',
					name: 'verbose',
					value: true,
				},
				{
					type: 'argument',
					value: 'b',
				},
			]);
		});
	});
});
