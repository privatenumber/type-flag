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
	parseFlagArgv,
	spliceFromArgv,
	type Index,
} from './argv-iterator.ts';

export const getFlag = <Type extends FlagType>(
	flagNames: string,
	flagType: Type,
	argv = process.argv.slice(2),
) => {
	const flags = new Set(
		flagNames.split(',').map(name => parseFlagArgv(name)?.[0]),
	);
	const [parser, gatherAll] = parseFlagType(flagType);
	const results: unknown[] = [];
	const removeArgvs: Index[] = [];

	// Pending value-expecting flag, read by `onValue`. Hoisted so no callback
	// closure is allocated per value-taking flag occurrence.
	let pendingFlagIndex: Index;
	let pendingName: string;
	const pushValue = (
		flagIndex: Index,
		rawName: string,
		value: string | boolean | undefined,
		valueIndex?: Index,
	) => {
		// Remove parsed elements from the argv array
		removeArgvs.push(flagIndex);
		if (valueIndex) {
			removeArgvs.push(valueIndex);
		}

		results.push(applyParser(parser, value || '', rawName));
	};

	argvIterator(argv, {
		knownFlags: flags,
		onFlag: (name, explicitValue, flagIndex) => {
			if (
				!flags.has(name)
				|| (!gatherAll && results.length > 0)
			) {
				return;
			}

			const flagValue = normalizeBoolean(parser, explicitValue);
			if (flagValue === undefined) {
				pendingFlagIndex = flagIndex;
				pendingName = name;
				return true;
			}

			pushValue(flagIndex, name, flagValue);
		},
		onValue: (value, valueIndex) => {
			pushValue(pendingFlagIndex, pendingName, value, valueIndex);
		},
	});

	spliceFromArgv(argv, removeArgvs);

	return (gatherAll ? results : results[0]) as InferFlagType<Type>;
};
