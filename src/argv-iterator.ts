export const DOUBLE_DASH = '--';

export const ALIAS_INDEX_LENGTH = 4;

export type Index =
	| [index: number]
	| [index: number, aliasIndex: number, isLast: boolean, characterLength: number];

type onValueCallback = (
	value: string | undefined,
	index: Index | undefined,
) => void;

// Return `true` to signal the flag expects a following token as its value
// (delivered via `onValue`). Avoids allocating a per-occurrence callback closure.
type onFlag = (
	name: string,
	value: string | undefined,
	index: Index,
) => boolean | void;

type onArgument = (
	args: string[],
	index: Index,
	isEoF?: boolean,
) => void;

const numberClass = String.raw`\p{N}`;
const letterOrUnderscoreClass = String.raw`\p{L}_`;
export const flagStartClass = `[${letterOrUnderscoreClass}${numberClass}]`;
const isFlagPattern = new RegExp(`^-{1,2}${flagStartClass}`, 'u');
const letterOrUnderscorePattern = new RegExp(`[${letterOrUnderscoreClass}]`, 'u');

// A dash followed by a Unicode number (\p{N}), such as `-5`, `-٥`, or `-Ⅳ`. A dash followed
// by a letter stays a flag, so `--range --verbose` still reports the missing value.
// `-.5` needs no rule here: it never matches `isFlagPattern`.
const dashDigitPattern = new RegExp(`^-${numberClass}`, 'u');

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
 * value-expecting flag: it must start with a dash and a Unicode number (\p{N})
 * (e.g. `-5`, `-٥`, `-Ⅳ`, `-5..10`) and NOT fully resolve to defined flags.
 *
 * If every character after the dash is a known flag, the token wins as a
 * flag/alias group instead (e.g. `-512` when 5, 1, and 2 are all defined).
 */
const isDashDigitValue = (
	argvElement: string,
	knownFlags: KnownFlags,
) => {
	if (!dashDigitPattern.test(argvElement)) {
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
		onValue,
		onArgument,
		knownFlags,
	}: {
		onFlag?: onFlag;
		onValue?: onValueCallback;
		onArgument?: onArgument;

		/**
		 * Defined flag/alias names. Used to decide whether a dash-digit
		 * token (e.g. `-5` or `-5..10`) should be consumed as a flag's value rather than
		 * parsed as a flag. A `Map` registry and a `Set` of names both satisfy it.
		 */
		knownFlags?: KnownFlags;
	},
) => {
	// Whether the previous flag expects the next token as its value. A boolean
	// flag (rather than storing a per-occurrence callback closure) keeps the
	// value-delivery call site monomorphic and allocation-free.
	let expectingValue = false;
	const triggerValueCallback = (
		value?: string,
		index?: Index,
	) => {
		if (!expectingValue) {
			return true;
		}

		expectingValue = false;
		onValue?.(value, index);
	};

	for (let i = 0; i < argv.length; i += 1) {
		const argvElement = argv[i];

		if (argvElement === DOUBLE_DASH) {
			triggerValueCallback();

			const remaining = argv.slice(i + 1);
			onArgument?.(remaining, [i], true);
			break;
		}

		// A value-expecting flag consumes a dash-digit token as its value,
		// unless the token resolves to defined flags.
		if (
			expectingValue
			&& knownFlags
			&& isDashDigitValue(argvElement, knownFlags)
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
				for (let j = 0; j < flagName.length;) {
					triggerValueCallback();

					// A supplementary character spans two UTF-16 units; index directly otherwise
					const character = flagName.codePointAt(j)! > 0xFF_FF
						? flagName.slice(j, j + 2)
						: flagName[j];
					const isLastAlias = j + character.length === flagName.length;
					expectingValue = onFlag(
						character,
						isLastAlias ? flagValue : undefined,
						[i, j + 1, isLastAlias, character.length],
					) === true;
					j += character.length;
				}
			} else {
				expectingValue = onFlag(
					flagName,
					flagValue,
					[i],
				) === true;
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
	// Single pass: `removeArgvs` arrives in ascending token order, because the
	// iterator flushes a pending value before it handles the next token.
	let writeIndex = 0;
	let removalIndex = 0;
	for (let readIndex = 0; readIndex < argv.length; readIndex += 1) {
		const removal = removeArgvs[removalIndex];
		if (!removal || removal[0] !== readIndex) {
			if (writeIndex !== readIndex) {
				argv[writeIndex] = argv[readIndex];
			}
			writeIndex += 1;
			continue;
		}

		if (removal.length === 1) {
			removalIndex += 1;
			continue;
		}

		const element = argv[readIndex];
		let remainder = '';
		let start = 1;
		let removedLast = false;
		while (removalIndex < removeArgvs.length && removeArgvs[removalIndex][0] === readIndex) {
			const [, aliasIndex, isLast, characterLength] = removeArgvs[removalIndex];
			remainder += element.slice(start, aliasIndex);
			start = aliasIndex! + characterLength!;
			removedLast = isLast!;
			removalIndex += 1;
		}
		if (!removedLast) {
			remainder += element.slice(start);
		}

		const suffixIndex = remainder.search(/[=:.]/u);
		const group = suffixIndex < 0 ? remainder : remainder.slice(0, suffixIndex);
		const suffix = suffixIndex < 0 ? '' : remainder.slice(suffixIndex);
		if (!group || (!suffix && /^-+$/u.test(group))) {
			continue;
		}
		const match = letterOrUnderscorePattern.exec(group);
		if (match && match.index > 0 && match.index + match[0].length < group.length) {
			argv[writeIndex] = `-${match[0]}${group.slice(0, match.index)}${group.slice(match.index + match[0].length)}${suffix}`;
		} else {
			argv[writeIndex] = `-${group}${suffix}`;
		}
		writeIndex += 1;
	}
	if (writeIndex !== argv.length) {
		argv.length = writeIndex;
	}
};
