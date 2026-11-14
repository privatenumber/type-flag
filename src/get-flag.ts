import type {
	InferFlagType,
	FlagType,
} from './types.ts';
import {
	parseFlagType,
	normalizeBoolean,
	applyParser,
} from './utils.ts';
import {
	argvIterator,
	spliceFromArgv,
	type Index,
} from './argv-iterator.ts';

export const getFlag = <Type extends FlagType>(
	flagNames: string,
	flagType: Type,
	argv = process.argv.slice(2),
) => {
	const shortFlags = new Set<string>();
	const longFlags = new Set<string>();
	let errorName = '';
	let errorSpelling = '';
	for (const part of flagNames.split(',')) {
		const name = part.trim();
		if (/^-\w$/.test(name)) {
			if (!errorSpelling) {
				errorName = name.slice(1);
				errorSpelling = name;
			}
			shortFlags.add(name.slice(1));
		} else if (/^--\w[^\s=:.]+$/.test(name)) {
			if (longFlags.size === 0) {
				errorName = name.slice(2);
				errorSpelling = name;
			}
			longFlags.add(name.slice(2));
		} else {
			throw new Error(`Invalid flag name: ${JSON.stringify(name)}`);
		}
	}
	const [parser, gatherAll] = parseFlagType(flagType);
	const results: unknown[] = [];
	let lastResult: unknown;
	const removeArgvs: Index[] = [];

	// Pending value-expecting flag, read by `onValue`. Hoisted so no callback
	// closure is allocated per value-taking flag occurrence.
	let pendingFlagIndex: Index;
	const pushValue = (
		flagIndex: Index,
		value: string | boolean | undefined,
		valueIndex?: Index,
	) => {
		// Remove parsed elements from the argv array
		removeArgvs.push(flagIndex);
		if (valueIndex) {
			removeArgvs.push(valueIndex);
		}

		const result = applyParser(parser, value || '', errorName, errorSpelling);
		if (gatherAll) {
			results.push(result);
		} else {
			// Only the last scalar value is returned, so earlier ones are not retained
			lastResult = result;
		}
	};

	argvIterator(argv, {
		knownFlags: shortFlags,
		onFlag: (name, explicitValue, flagIndex) => {
			if (!(flagIndex.length === 1 ? longFlags : shortFlags).has(name)) {
				return;
			}

			const flagValue = normalizeBoolean(parser, explicitValue);
			if (flagValue === undefined) {
				pendingFlagIndex = flagIndex;
				return true;
			}

			pushValue(flagIndex, flagValue);
		},
		onValue: (value, valueIndex) => {
			pushValue(pendingFlagIndex, value, valueIndex);
		},
	});

	spliceFromArgv(argv, removeArgvs);

	return (gatherAll ? results : lastResult) as InferFlagType<Type>;
};
