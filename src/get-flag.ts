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

	return (gatherAll ? results : results[0]) as InferFlagType<Type>;
};
