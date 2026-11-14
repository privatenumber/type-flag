import { describe, test, expect } from 'manten';
import { getFlag, FlagParseError } from '#type-flag';

describe('Parsing', () => {
	test('Boolean literals across delimiters and aliases', () => {
		for (const separator of ['=', ':', '.']) {
			for (const [value, expected] of [['true', true], ['false', false]] as const) {
				for (const token of [`--verbose${separator}${value}`, `-av${separator}${value}`]) {
					expect(getFlag('-v,--verbose', [Boolean], [token])).toStrictEqual([expected]);
				}
			}
			expect(() => getFlag('--verbose', Boolean, [`--verbose${separator}bad`])).toThrow(FlagParseError);
		}
	});

	test('rejects invalid array values with the short search name', () => {
		let thrown: unknown;
		try {
			getFlag('-v', [Boolean], ['-v=a"b']);
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(FlagParseError);
		expect((thrown as FlagParseError).flagName).toBe('v');
		expect((thrown as FlagParseError).message).toBe(`Flag "-v": invalid boolean value ${JSON.stringify('a"b')}; expected "true" or "false"`);
	});
	for (const value of ['0', 'FALSE', 'flase', '']) {
		for (const token of [`--verbose=${value}`, `-av=${value}`]) {
			test(`rejects Boolean ${JSON.stringify(token)}`, () => {
				let thrown: unknown;
				try {
					getFlag('-v,--verbose', Boolean, [token]);
				} catch (error) {
					thrown = error;
				}
				const message = `invalid boolean value ${JSON.stringify(value)}; expected "true" or "false"`;
				expect(thrown).toBeInstanceOf(FlagParseError);
				expect((thrown as FlagParseError).flagName).toBe('verbose');
				expect((thrown as FlagParseError).message).toBe(`Flag "--verbose": ${message}`);
				expect((thrown as FlagParseError).cause).toBeInstanceOf(Error);
				expect(((thrown as FlagParseError).cause as Error).message).toBe(message);
			});
		}
	}
	for (const [search, token, name, spelling] of [
		['-a,--age', '-a', 'age', '--age'],
		['-a', '-a', 'a', '-a'],
		['-a,--orgId,--other', '--other', 'orgId', '--orgId'],
	] as const) {
		test(`canonical error name for ${search} matched by ${token}`, () => {
			let thrown: unknown;
			try {
				getFlag(search, () => {
					throw new Error('bad value');
				}, [token, 'bad']);
			} catch (error) {
				thrown = error;
			}
			expect(thrown).toBeInstanceOf(FlagParseError);
			expect((thrown as FlagParseError).flagName).toBe(name);
			expect((thrown as FlagParseError).message).toBe(`Flag "${spelling}": bad value`);
		});
	}

	test('wraps a thrown value that cannot be converted to a string', () => {
		const cause = Object.create(null);
		let thrown: unknown;
		try {
			getFlag('-a,--age', () => {
				throw cause;
			}, ['-a', 'bad']);
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(FlagParseError);
		expect((thrown as FlagParseError).cause).toBe(cause);
		expect((thrown as FlagParseError).flagName).toBe('age');
		expect((thrown as FlagParseError).message).toBe('Flag "--age": Unknown error');
	});

	describe('alias', () => {
		test('gets the last number and consumes every occurrence', () => {
			const argv = ['-n', '1111', '2222', '-n', '3333'];
			const flagValue = getFlag('-n', Number, argv);

			expect<number | undefined>(flagValue).toBe(3333);
			expect(argv).toStrictEqual(['2222']);
		});

		test('expecting value but no value', () => {
			const argv = ['-n'];
			const flagValue = getFlag('-n', Number, argv);

			expect<number | undefined>(flagValue).toBe(Number.NaN);
			expect(argv).toStrictEqual([]);
		});

		test('explicit value', () => {
			const argv = ['-n=1'];
			const flagValue = getFlag('-n', Number, argv);

			expect<number | undefined>(flagValue).toBe(1);
			expect(argv).toStrictEqual([]);
		});

		test('alias group', () => {
			const argv = ['-aliases'];
			const flagValue = getFlag('-a', [Boolean], argv);

			expect<boolean[]>(flagValue).toStrictEqual([true, true]);
			expect(argv).toStrictEqual(['-lises']);
		});

		test('alias group with value', () => {
			const argv = ['-aliasesa=value'];
			const flagValue = getFlag('-a', [String], argv);

			expect<string[]>(flagValue).toStrictEqual(['', '', 'value']);
			expect(argv).toStrictEqual(['-lises']);
		});
	});

	describe('named flag', () => {
		test('boolean', () => {
			const argv = ['--boolean'];
			const flagValue = getFlag('--boolean', Boolean, argv);

			expect<boolean | undefined>(flagValue).toBe(true);
			expect(argv).toStrictEqual([]);
		});

		test('boolean with explicit false', () => {
			const argv = ['--boolean=false'];
			const flagValue = getFlag('--boolean', Boolean, argv);

			expect<boolean | undefined>(flagValue).toBe(false);
			expect(argv).toStrictEqual([]);
		});

		test('boolean with explicit true', () => {
			const argv = ['--boolean=true'];
			const flagValue = getFlag('--boolean', Boolean, argv);

			expect<boolean | undefined>(flagValue).toBe(true);
			expect(argv).toStrictEqual([]);
		});

		test('multiple booleans', () => {
			const argv = ['--boolean', '--unknown', '--boolean'];
			const flagValue = getFlag('--boolean', [Boolean], argv);

			expect<boolean[]>(flagValue).toStrictEqual([true, true]);
			expect(argv).toStrictEqual(['--unknown']);
		});

		test('flag named __proto__', () => {
			const argv = ['--__proto__'];
			const flagValue = getFlag('--__proto__', Boolean, argv);

			expect<boolean | undefined>(flagValue).toBe(true);
			expect(argv).toStrictEqual([]);
		});
	});

	test('matches the dash form', () => {
		const unmatched = ['--h'];
		expect(getFlag('-h', Boolean, unmatched)).toBe(undefined);
		expect(unmatched).toStrictEqual(['--h']);

		const argv = ['--h', '-vh', '--help'];
		expect(getFlag('-h', Boolean, argv)).toBe(true);
		expect(argv).toStrictEqual(['--h', '-v', '--help']);
		expect(getFlag('--help', Boolean, argv)).toBe(true);
		expect(argv).toStrictEqual(['--h', '-v']);
	});

	test('trims search names', () => {
		const argv = ['-b', '--aa'];
		expect(getFlag('--aa, -b', [Boolean], argv)).toStrictEqual([true, true]);
		expect(argv).toStrictEqual([]);
	});

	test('rejects invalid search names', () => {
		for (const name of ['a', '-help', '--h', '', '---x', '--name=value', '-a, ']) {
			const argv = ['-a'];
			expect(() => getFlag(name, Boolean, argv)).toThrow(JSON.stringify(name === '-a, ' ? '' : name));
			expect(argv).toStrictEqual(['-a']);
		}
	});

	test('ignores argv', () => {
		const argv = ['--boolean', 'arg'];
		const flagValue = getFlag('--boolean', Boolean, argv);

		expect<boolean | undefined>(flagValue).toBe(true);
		expect(argv).toStrictEqual(['arg']);
	});

	test('leaves irrelevant argvs', () => {
		const argv = ['-b', '2', '--boolean'];
		const flagValue = getFlag('-b', [Boolean], argv);

		expect<boolean[]>(flagValue).toStrictEqual([true]);
		expect(argv).toStrictEqual(['2', '--boolean']);
	});

	test('multiple flag aliases', () => {
		const argv = ['-b', '2', '--boolean'];
		const flagValue = getFlag('-b,--boolean', [Boolean], argv);

		expect<boolean[]>(flagValue).toStrictEqual([true, true]);
		expect(argv).toStrictEqual(['2']);
	});

	test('end of flags - flag after --', () => {
		const argv = ['--', '--flag', 'value'];
		const flagValue = getFlag('--flag', String, argv);

		expect<string | undefined>(flagValue).toBe(undefined);
		expect(argv).toStrictEqual(['--', '--flag', 'value']);
	});

	test('end of flags - flag before --', () => {
		const argv = ['--flag', 'value', '--', '--flag', 'after'];
		const flagValue = getFlag('--flag', String, argv);

		expect<string | undefined>(flagValue).toBe('value');
		expect(argv).toStrictEqual(['--', '--flag', 'after']);
	});

	describe('negative number values', () => {
		test('a searched digit alias is not consumed as a value', () => {
			const argv = ['-n', '-5'];
			expect(getFlag('-n,-5', [String], argv)).toStrictEqual(['', '']);
			expect(argv).toStrictEqual([]);
		});

		test('named flag consumes negative', () => {
			const argv = ['--retry', '-5'];
			const flagValue = getFlag('--retry', Number, argv);

			expect<number | undefined>(flagValue).toBe(-5);
			expect(argv).toStrictEqual([]);
		});

		test('alias consumes negative', () => {
			const argv = ['-n', '-5'];
			const flagValue = getFlag('-n', Number, argv);

			expect<number | undefined>(flagValue).toBe(-5);
			expect(argv).toStrictEqual([]);
		});

		test('negative not for the searched flag is left untouched', () => {
			const argv = ['--foo', '-5', '--retry', '3'];
			const flagValue = getFlag('--retry', Number, argv);

			expect<number | undefined>(flagValue).toBe(3);
			expect(argv).toStrictEqual(['--foo', '-5']);
		});

		test('consumes a value that starts with a negative number', () => {
			const argv = ['--range', '-5..10'];
			const flagValue = getFlag('--range', String, argv);

			expect<string | undefined>(flagValue).toBe('-5..10');
			expect(argv).toStrictEqual([]);
		});
	});
});
