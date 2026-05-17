import type { PositionalArguments } from './types.ts';

export const createPositionalArguments = (
	argv: readonly string[],
): PositionalArguments => {
	const delimiterIndex = argv.indexOf('--');

	if (delimiterIndex === -1) {
		return Object.assign(
			[...argv],
			{ '--': [] },
		);
	}

	const beforeDelimiter = argv.slice(0, delimiterIndex);
	const afterDelimiter = argv.slice(delimiterIndex + 1);

	return Object.assign(
		[
			...beforeDelimiter,
			...afterDelimiter,
		],
		{ '--': afterDelimiter },
	);
};
