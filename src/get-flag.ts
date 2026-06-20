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
	isNegativeNumberValue,
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

	argvIterator(argv, {
		isValueToken: argvElement => isNegativeNumberValue(
			argvElement,
			flagName => flags.has(flagName),
		),
		onFlag: (name, explicitValue, flagIndex) => {
			if (
				!flags.has(name)
				|| (!gatherAll && results.length > 0)
			) {
				return;
			}

			const flagValue = normalizeBoolean(parser, explicitValue);
			const getFollowingValue = (
				implicitValue?: string | boolean,
				valueIndex?: Index,
			) => {
				// Remove elements from argv array
				removeArgvs.push(flagIndex);
				if (valueIndex) {
					removeArgvs.push(valueIndex);
				}

				results.push(applyParser(parser, implicitValue || '', name));
			};

			return (
				flagValue === undefined
					? getFollowingValue
					: getFollowingValue(flagValue)
			);
		},
	});

	spliceFromArgv(argv, removeArgvs);

	return (gatherAll ? results : results[0]) as InferFlagType<Type>;
};
