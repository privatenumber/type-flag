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

const valueDelimiterPattern = /[.:=]/;

const isFlagPattern = /^-{1,2}\w/;

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

	const hasValueDalimiter = flagName.match(valueDelimiterPattern);
	if (hasValueDalimiter) {
		const { index } = hasValueDalimiter;
		flagValue = flagName.slice(index! + 1);
		flagName = flagName.slice(0, index);
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
	for (const [index, aliasIndex, isLast] of removeArgvs.reverse()) {
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
