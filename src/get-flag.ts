import { describe, test, expect } from 'manten';
import type {
	InferFlagType,
	FlagType,
} from './types';
import {
	parseFlagType,
	parseFlagArgv,
	normalizeBoolean,
	applyParser,
} from './utils';
import { argvIterator } from './argv-iterator';

export const getFlag = <Schema extends FlagType>(
	flagNames: string,
	flagType: Schema,
	argv = process.argv.slice(2),
) => {
	// eslint-disable-next-line unicorn/prefer-set-has
	const flags = flagNames.split(',').map(name => parseFlagArgv(name)?.[0]);
	const [parser, gatherAll] = parseFlagType(flagType);
	const results: any[] = [];
	const removeArgvs: number[] = [];
	argvIterator(argv, {
		onFlag(name, explicitValue, flagIndex) {
			if (!flags.includes(name)) {
				return;
			}

			const value = normalizeBoolean(parser, explicitValue);
			const add = (implicitValue?: string | boolean, valueIndex?: number) => {
				results.push(applyParser(parser, implicitValue));

				// Remove elements from argv array
				removeArgvs.push(flagIndex);
				if (valueIndex) {
					removeArgvs.push(valueIndex);
				}

				if (!gatherAll) {
					// Terminate iteration
					return false;
				}
			};
			return value === undefined ? add : add(value);
		},
	});

	for (const i of removeArgvs.reverse()) {
		argv.splice(i, 1);
	}

	return (gatherAll ? results : results[0]) as InferFlagType<Schema>;
};

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
