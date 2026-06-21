export const DOUBLE_DASH = '--';

export const ALIAS_INDEX_LENGTH = 3;

export type Index =
	| [index: number]
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

const isFlagPattern = /^-{1,2}\w/;

const negativeNumberPattern = /^-(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i;

/**
 * A membership-checkable collection of defined flag/alias names. Both the
 * `typeFlag` registry (a `Map`) and `getFlag`'s searched names (a `Set`)
 * satisfy this, so neither call site needs a wrapper or conversion.
 */
type KnownFlags = {
	has: (flagName: string) => boolean;
};

/**
 * Whether a flag-shaped token should be consumed as the value of a
 * value-expecting flag: it must look like a single-dash negative number
 * (e.g. `-5`, `-5.5`, `-5e3`) and NOT fully resolve to defined flags.
 *
 * If every character after the dash is a known flag, the token wins as a
 * flag/alias group instead (e.g. `-512` when 5, 1, and 2 are all defined).
 */
const isNegativeNumberValue = (
	argvElement: string,
	knownFlags: KnownFlags,
) => {
	if (!negativeNumberPattern.test(argvElement)) {
		return false;
	}

	// A flag/alias group requires EVERY character to be a defined flag, so the
	// first non-flag character means the token is a value (e.g. the `0` in `-50`).
	for (let i = 1; i < argvElement.length; i += 1) {
		if (!knownFlags.has(argvElement[i])) {
			return true;
		}
	}

	// Every character is a defined flag (e.g. `-512` when 5, 1, 2 are defined).
	return false;
};

export const parseFlagArgv = (
	flagArgv: string,
): [
	flagName: string,
	flagValue: string | undefined,
	isAlias: boolean,
] | undefined => {
	if (!isFlagPattern.test(flagArgv)) {
		return;
	}

	const isAlias = !flagArgv.startsWith(DOUBLE_DASH);
	let flagName = flagArgv.slice(isAlias ? 1 : 2);
	let flagValue;

	// Find the first (leftmost) delimiter among =, :, and .
	// Avoiding regex for performance - indexOf is much faster
	let delimiterIndex = -1;
	for (const delimiter of ['=', ':', '.']) {
		const index = flagName.indexOf(delimiter);
		if (index !== -1 && (delimiterIndex === -1 || index < delimiterIndex)) {
			delimiterIndex = index;
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
		knownFlags,
	}: {
		onFlag?: onFlag;
		onArgument?: onArgument;

		/**
		 * Defined flag/alias names. Used to decide whether a negative-number
		 * token (e.g. `-5`) should be consumed as a flag's value rather than
		 * parsed as a flag. A `Map` registry and a `Set` of names both satisfy it.
		 */
		knownFlags?: KnownFlags;
	},
) => {
	let onValueCallback!: void | onValueCallbackType;
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

		// A value-expecting flag consumes a negative-number token as its value,
		// unless the token resolves to defined flags.
		if (
			onValueCallback
			&& knownFlags
			&& isNegativeNumberValue(argvElement, knownFlags)
		) {
			triggerValueCallback(argvElement, [i]);
			continue;
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
	for (let i = removeArgvs.length - 1; i >= 0; i -= 1) {
		const [index, aliasIndex, isLast] = removeArgvs[i];
		if (aliasIndex) {
			const element = argv[index];
			let newValue = element.slice(0, aliasIndex);
			if (!isLast) {
				newValue += element.slice(aliasIndex + 1);
			}

			if (newValue !== '-') {
				argv[index] = newValue;
				continue;
			}
		}

		argv.splice(index, 1);
	}
};
