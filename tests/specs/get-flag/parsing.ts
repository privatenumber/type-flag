import { describe, test, expect } from 'manten';
import { getFlag } from '#type-flag';

describe('Parsing', () => {
	describe('alias', () => {
		test('gets number', () => {
			const argv = ['-n', '1111', '2222', '-n', '3333'];
			const flagValue = getFlag('-n', Number, argv);

			expect<number | undefined>(flagValue).toBe(1111);
			expect(argv).toStrictEqual(['2222', '-n', '3333']);
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

		test('casts boolean with explicit value', () => {
			const argv = ['--boolean=value'];
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
	});
});
