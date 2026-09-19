import { DOUBLE_DASH } from './argv-iterator.ts';
import type { PositionalArguments } from './types.ts';

export const createPositionalArgumentsFromParts = (
	argv: string[],
	doubleDashArguments: string[],
): PositionalArguments => Object.assign(
	argv,
	{ [DOUBLE_DASH]: doubleDashArguments },
);

/**
 * Build a {@link PositionalArguments} array from raw argv, splitting on the
 * `--` delimiter so tokens after `--` are also exposed on the `'--'` property.
 */
export const createPositionalArguments = (
	argv: readonly string[],
): PositionalArguments => {
	const delimiterIndex = argv.indexOf(DOUBLE_DASH);

	if (delimiterIndex === -1) {
		return createPositionalArgumentsFromParts(
			[...argv],
			[],
		);
	}

	const beforeDelimiter = argv.slice(0, delimiterIndex);
	const afterDelimiter = argv.slice(delimiterIndex + 1);

	return createPositionalArgumentsFromParts(
		[
			...beforeDelimiter,
			...afterDelimiter,
		],
		afterDelimiter,
	);
};
