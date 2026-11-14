import { parseArgs } from 'node:util';
import { describe, test, expect } from 'manten';
import { getFlag, typeFlag, FlagParseError } from '#type-flag';

describe('Parsing', () => {
	test('extracts a known flag from an unknown attached value', () => {
		const argv = ['-nvalue'];
		expect(typeFlag({ n: String }, [...argv]).flags.n).toBe('value');
		expect(getFlag('-v', Boolean, argv)).toBe(true);
		expect(argv).toStrictEqual(['-nalue']);
		expect(typeFlag({ n: String }, argv).flags.n).toBe('alue');
		expect(getFlag('-v', Boolean, ['-xv'])).toBe(true);
	});

	test('attached short values match typeFlag and remove the value', () => {
		for (const [token, value] of [['-nfoo', 'foo'], ['-n=foo', 'foo'], ['-n:foo', 'foo'], ['-n.foo', 'foo'], ['-n==foo', '=foo'], ['-n😀x', '😀x']] as const) {
			const argv = [token];
			expect(getFlag('-n', String, argv)).toBe(value);
			expect(argv).toStrictEqual([]);
		}
		const argv = ['-vnfoo'];
		expect(getFlag('-n', String, argv)).toBe('foo');
		expect(argv).toStrictEqual(['-v']);
		expect(getFlag('-n', String, ['-vn', 'foo'])).toBe('foo');
		expect(getFlag('-c', Number, ['-c5'])).toBe(5);
	});
	test('keeps the last group member as the next-token value owner', () => {
		const argv = ['-q5a', 'file'];
		getFlag('-q', Boolean, argv);
		expect(argv).toStrictEqual(['-5a', 'file']);
		const result = typeFlag({
			5: Boolean,
			a: String,
		}, argv);
		expect([result.flags[5], result.flags.a]).toStrictEqual([true, 'file']);
	});

	test('preserves a dash remainder with an attached value', () => {
		const argv = ['-q-=value', '--rest'];
		getFlag('-q', Boolean, argv);
		expect(argv).toStrictEqual(['--=value', '--rest']);
		const result = typeFlag({ rest: Boolean }, argv);
		expect(result._).toStrictEqual(Object.assign(['--=value'], { '--': [] }));
		expect(result.flags.rest).toBe(true);
	});

	test('forwarded group does not become a delimiter', () => {
		const argv = ['-q-', '--verbose'];
		getFlag('-q', Boolean, argv);
		expect(argv).toStrictEqual(['--verbose']);
		expect(typeFlag({ verbose: Boolean }, argv).flags.verbose).toBe(true);
	});

	test('forwarded group can become a long flag', () => {
		const argv = ['-q-abc'];
		getFlag('-q', Boolean, argv);
		expect(argv).toStrictEqual(['--abc']);
		expect(typeFlag({ abc: Boolean }, argv).flags.abc).toBe(true);
	});

	test('forwarded number-led group retains a last letter', () => {
		const argv = ['--name', '-q5x'];
		getFlag('-q', Boolean, argv);
		expect(argv).toStrictEqual(['--name', '-5x']);
		const result = typeFlag({
			name: String,
			x: Boolean,
			5: Boolean,
		}, argv);
		expect([result.flags.name, result.flags.x, result.flags[5]]).toStrictEqual(['', true, true]);
	});

	test('forwarded group preserves order for downstream parsers', () => {
		const argv = ['-q5xy'];
		getFlag('-q', Boolean, argv);
		expect(argv).toStrictEqual(['-5xy']);
		const nodeResult = parseArgs({
			args: argv,
			options: {
				5: { type: 'boolean' },
				x: { type: 'string' },
			},
		});
		expect({ ...nodeResult.values }).toStrictEqual({
			5: true,
			x: 'y',
		});
		const result = typeFlag({
			x: Boolean,
			5: Boolean,
			y: String,
		}, [...argv, 'file']);
		expect([result.flags.x, result.flags[5], result.flags.y]).toStrictEqual([true, true, 'file']);
	});

	test('forwarded group can become positional', () => {
		const argv = ['-q?'];
		getFlag('-q', Boolean, argv);
		expect(argv).toStrictEqual(['-?']);
		expect(typeFlag({}, argv)._).toStrictEqual(Object.assign(['-?'], { '--': [] }));
	});

	test('preserves the raw attached value remainder as a positional', () => {
		const argv = ['-q?a=x'];
		getFlag('-q', Boolean, argv);
		expect(argv).toStrictEqual(['-?a=x']);
		expect(typeFlag({ a: String }, argv)._).toStrictEqual(Object.assign(['-?a=x'], { '--': [] }));
	});

	test('preserves the raw empty attached value remainder as a positional', () => {
		const argv = ['-q?_='];
		getFlag('-q', Boolean, argv);
		expect(argv).toStrictEqual(['-?_=']);
		expect(typeFlag({ _: String }, argv)._).toStrictEqual(Object.assign(['-?_='], { '--': [] }));
	});

	test('removing the last group member removes its attached value', () => {
		const argv = ['-aq=true'];
		getFlag('-q', Boolean, argv);
		expect(argv).toStrictEqual(['-a']);
		expect(typeFlag({ a: Boolean }, argv).flags.a).toBe(true);
	});

	test('forwarded group preserves order and attached value', () => {
		for (const separator of ['=', ':', '.']) {
			const argv = [`-q?ab${separator}value`];
			getFlag('-q', Boolean, argv);
			expect(argv).toStrictEqual([`-?ab${separator}value`]);
			const result = typeFlag({
				a: Boolean,
				b: String,
			}, argv);
			expect(result._).toStrictEqual(Object.assign([`-?ab${separator}value`], { '--': [] }));
		}
	});

	test('retains multiple remaining dashes', () => {
		const argv = ['-q--'];
		getFlag('-q', Boolean, argv);
		expect(argv).toStrictEqual(['---']);
	});

	test('forwarding a group can change which flag takes the next value', () => {
		const argv = ['-ab', 'file'];
		getFlag('-b', Boolean, argv);
		expect(argv).toStrictEqual(['-a', 'file']);
		expect(typeFlag({ a: String }, argv).flags.a).toBe('file');
	});

	test('forwarding a number-only group remains a value candidate', () => {
		const argv = ['--name', '-q5'];
		getFlag('-q', Boolean, argv);
		expect(argv).toStrictEqual(['--name', '-5']);
		expect(typeFlag({ name: String }, argv).flags.name).toBe('-5');
	});

	test('forwarded group removes several matches and preserves supplementary characters', () => {
		const argv = ['-q𐐀q5a'];
		getFlag('-q', Boolean, argv);
		expect(argv).toStrictEqual(['-𐐀5a']);
		const result = typeFlag({
			a: Boolean,
			5: Boolean,
		}, argv);
		expect(result.unknownFlags['𐐀']).toStrictEqual([true]);
		expect([result.flags[5], result.flags.a]).toStrictEqual([true, true]);
	});
	test('Unicode numbers are values unless all aliases are searched', () => {
		for (const value of ['-٥', '-Ⅳ', '-𝟝']) {
			expect(getFlag('-x', String, ['-x', value])).toBe(value);
		}
		expect(getFlag('-x,-٥', String, ['-x', '-٥'])).toBe('');
	});

	test('supplementary character is a long search name', () => {
		expect(getFlag('--𐐀', String, ['--𐐀', 'x'])).toBe('x');
		expect(() => getFlag('--é', Boolean, [])).toThrow('Invalid flag name: "--é"');
	});
	test('Unicode long search name matches a Unicode token', () => {
		expect(getFlag('--über', String, ['--über', 'x'])).toBe('x');
	});

	test('Unicode short search name matches a Unicode token', () => {
		expect(getFlag('-é', Boolean, ['-é'])).toBe(true);
	});

	test('supplementary characters cannot be short search names', () => {
		expect(() => getFlag('-𐐀', Boolean, [])).toThrow('Invalid flag name: "-𐐀"');
	});

	test('Unicode flag is not consumed as a preceding value', () => {
		const argv = ['--name', '--über'];
		expect(getFlag('--name', String, argv)).toBe('');
		expect(argv).toStrictEqual(['--über']);
	});
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

			expect<string[]>(flagValue).toStrictEqual(['liasesa=value']);
			expect(argv).toStrictEqual([]);
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
