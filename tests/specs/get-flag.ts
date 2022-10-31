import { testSuite, expect } from 'manten';
import { getFlag } from '#type-flag';

export default testSuite(({ describe }) => {
	describe('get-flag', ({ describe, test }) => {
		describe('alias', ({ test }) => {
			test('', () => {
				const argv = ['-n', '1234', '1212'];
				const n = getFlag('-n', Number, argv);
				expect<number | undefined>(n).toBe(1234);
				expect(argv).toStrictEqual(['1212']);
			});

			test('Expecting value but no value', () => {
				const argv = ['-n'];
				const n = getFlag('-n', Number, argv);
				expect<number | undefined>(n).toBe(Number.NaN);
				expect(argv).toStrictEqual([]);
			});

			test('Explicit value', () => {
				const argv = ['-n=1'];
				const n = getFlag('-n', Number, argv);
				expect<number | undefined>(n).toBe(1);
				expect(argv).toStrictEqual([]);
			});
		});

		describe('named flag', ({ test }) => {
			test('boolean', () => {
				const argv = ['--boolean'];
				const n = getFlag('--boolean', Boolean, argv);
				expect<boolean | undefined>(n).toBe(true);
				expect(argv).toStrictEqual([]);
			});

			test('boolean with explicit false', () => {
				const argv = ['--boolean=false'];
				const n = getFlag('--boolean', Boolean, argv);
				expect<boolean | undefined>(n).toBe(false);
				expect(argv).toStrictEqual([]);
			});

			test('multiple booleans', () => {
				const argv = ['--boolean', '--unknown', '--boolean'];
				const booleans = getFlag('--boolean', [Boolean], argv);
				expect<boolean[]>(booleans).toStrictEqual([true, true]);
				expect(argv).toStrictEqual(['--unknown']);
			});
		});

		test('', () => {
			const argv = ['--boolean', 'arg'];
			const n = getFlag('--boolean', Boolean, argv);

			expect<boolean | undefined>(n).toBe(true);
			expect(argv).toStrictEqual(['arg']);
		});

		test('', () => {
			const argv = ['-aliases'];
			const a = getFlag('-a', [Boolean], argv);
			expect<boolean[]>(a).toStrictEqual([true, true]);
			expect(argv).toStrictEqual([]);
		});

		test('', () => {
			const argv = ['-b', '2', '--boolean'];
			const a = getFlag('-b', [Boolean], argv);
			expect<boolean[]>(a).toStrictEqual([true]);
			expect(argv).toStrictEqual(['2', '--boolean']);
		});

		test('multiple flag aliases', () => {
			const argv = ['-b', '2', '--boolean'];
			const a = getFlag('-b,--boolean', [Boolean], argv);
			expect<boolean[]>(a).toStrictEqual([true, true]);
			expect(argv).toStrictEqual(['2']);
		});
	});
});
