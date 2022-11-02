import type {
	InferFlagType,
	FlagType,
} from './types';
import {
	parseFlagType,
	normalizeBoolean,
	applyParser,
} from './utils';
import {
	argvIterator,
	parseFlagArgv,
	spliceFromArgv,
	type Index,
} from './argv-iterator';

export const getFlag = <Type extends FlagType>(
	flagNames: string,
	flagType: Type,
	argv = process.argv.slice(2),
) => {
	// eslint-disable-next-line unicorn/prefer-set-has
	const flags = flagNames.split(',').map(name => parseFlagArgv(name)?.[0]);
	const [parser, gatherAll] = parseFlagType(flagType);
	const results: any[] = [];
	const removeArgvs: Index[] = [];

	argvIterator(argv, {
		onFlag(name, explicitValue, flagIndex) {
			if (
				!flags.includes(name)
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

				results.push(applyParser(parser, implicitValue || ''));
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
