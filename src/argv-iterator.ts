export const DOUBLE_DASH = '--';

type onValueCallbackType = (
	value?: string,
	index?: number,
) => void;

type onFlag = (
	name: string,
	value: string | undefined,
	index: number,
) => void | onValueCallbackType;

type onArgument = (
	args: string[],
	index: number,
	isEoF?: boolean,
) => void;

const valueDelimiterPattern = /[.:=]/;

const isFlagPattern = /^-{1,2}[\da-z]/i;

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
	if (hasValueDalimiter?.index) {
		const equalIndex = hasValueDalimiter.index;
		flagValue = flagName.slice(equalIndex + 1);
		flagName = flagName.slice(0, equalIndex);
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
		index?: number,
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
			onArgument?.(remaining, i, true);
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
					onValueCallback = onFlag(
						flagName[j],
						// Value only gets assigned to last alias
						(j === flagName.length - 1) ? flagValue : undefined,
						i,
					);
				}
			} else {
				onValueCallback = onFlag(
					flagName,
					flagValue,
					i,
				);
			}
		} else if (triggerValueCallback(argvElement, i)) { // if no callback was set
			onArgument?.([argvElement], i);
		}
	}

	triggerValueCallback();
};
