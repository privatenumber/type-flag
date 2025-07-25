export const DOUBLE_DASH = '--';

export type Index =	| [index: number]
	| [index: number, aliasIndex: number, isLast: boolean];

type onValueCallbackType = (
	value?: string,
	index?: Index,
) => void;

type onFlag = (
	name: string,
	value: string | undefined,
	index: Index,
) => void | onValueCallbackType;

type onArgument = (
	args: string[],
	index: Index,
	isEoF?: boolean,
) => void;

/**
 * A fast check to see if an argument is a flag.
 * - Starts with `-` or `--`.
 * - Is not just `-` or `--`.
 * - The character after the hyphen(s) is a "word" character.
 * This is a performance optimization for the equivalent regex: /^-{1,2}\w/
 */
const isFlag = (argument: string): boolean => {
	if (argument[0] !== '-') {
		return false;
	}

	const char1 = argument[1];
	const char: string | undefined = (
		char1 === '-'
			? argument[2] // Long flag like --foo
			: char1 // Short flag like -f
	);
	if (char === undefined) {
		return false;
	}

	// This is a manual check for a "word" character, equivalent to \w in regex.
	const characterCode = char.codePointAt(0)!;
	return (characterCode >= 48 && characterCode <= 57) // 0-9
		|| (characterCode >= 65 && characterCode <= 90) // A-Z
		|| characterCode === 95 // _
		|| (characterCode >= 97 && characterCode <= 122); // a-z
};

export const parseFlagArgv = (
	flagArgv: string,
): [
	flagName: string,
	flagValue: string | undefined,
	isAlias: boolean,
] | undefined => {
	if (!isFlag(flagArgv)) {
		return;
	}

	const isAlias = !flagArgv.startsWith(DOUBLE_DASH);
	let flagName = flagArgv.slice(isAlias ? 1 : 2);
	let flagValue;

	// This is faster than a regex for finding the first delimiter
	let delimiterIndex = -1;
	for (let i = 0; i < flagName.length; i += 1) {
		const char = flagName[i];
		if (char === '.' || char === ':' || char === '=') {
			delimiterIndex = i;
			break;
		}
	}

	if (delimiterIndex !== -1) {
		flagValue = flagName.slice(delimiterIndex + 1);
		flagName = flagName.slice(0, delimiterIndex);
	}

	return [flagName, flagValue, isAlias];
};

export const argvIterator = (
	argv: string[],
	{
		onFlag,
		onArgument,
	}: {
		onFlag?: onFlag;
		onArgument?: onArgument;
	},
) => {
	let onValueCallback: void | onValueCallbackType;
	const triggerValueCallback = (
		value?: string,
		index?: Index,
	) => {
		if (typeof onValueCallback !== 'function') {
			return true;
		}

		onValueCallback(value, index);
		onValueCallback = undefined;
	};

	for (let i = 0; i < argv.length; i += 1) {
		const argvElement = argv[i];

		if (argvElement === DOUBLE_DASH) {
			triggerValueCallback();

			const remaining = argv.slice(i + 1);
			onArgument?.(remaining, [i], true);
			break;
		}

		const parsedFlag = parseFlagArgv(argvElement);

		if (parsedFlag) {
			triggerValueCallback();

			if (!onFlag) {
				continue;
			}

			const [flagName, flagValue, isAlias] = parsedFlag;

			if (isAlias) {
				// Alias group
				for (let j = 0; j < flagName.length; j += 1) {
					triggerValueCallback();

					const isLastAlias = j === flagName.length - 1;
					onValueCallback = onFlag(
						flagName[j],
						isLastAlias ? flagValue : undefined,
						[i, j + 1, isLastAlias],
					);
				}
			} else {
				onValueCallback = onFlag(
					flagName,
					flagValue,
					[i],
				);
			}
		} else if (triggerValueCallback(argvElement, [i])) { // if no callback was set
			onArgument?.([argvElement], [i]);
		}
	}

	triggerValueCallback();
};

export const spliceFromArgv = (
	argv: string[],
	removeArgvs: Index[],
) => {
	if (removeArgvs.length === 0) {
		return;
	}

	const indicesToSplice = new Set<number>();
	const aliasRemoveInstructions: [number, number, boolean][] = [];

	// Separate full removals from alias group modifications
	for (const instruction of removeArgvs) {
		if (instruction[1]) {
			aliasRemoveInstructions.push(instruction as [number, number, boolean]);
		} else {
			indicesToSplice.add(instruction[0]);
		}
	}

	// Process alias modifications first. These mutate strings in-place in the argv.
	// The array is reversed to process aliases from right-to-left,
	// which correctly handles modifications on the same string.
	for (const [index, aliasIndex, isLast] of aliasRemoveInstructions.reverse()) {
		const element = argv[index];
		let newValue = element.slice(0, aliasIndex);
		if (!isLast) {
			newValue += element.slice(aliasIndex + 1);
		}

		if (newValue !== '-') {
			argv[index] = newValue;
		} else {
			// The alias group is now empty (e.g., only '-') so it should be removed entirely
			indicesToSplice.add(index);
		}
	}

	// Perform all removals in a single, efficient pass
	if (indicesToSplice.size > 0) {
		let writeIndex = 0;
		for (let readIndex = 0; readIndex < argv.length; readIndex += 1) {
			if (!indicesToSplice.has(readIndex)) {
				argv[writeIndex] = argv[readIndex];
				writeIndex += 1;
			}
		}
		argv.length = writeIndex;
	}
};
