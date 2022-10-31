import {
	DOUBLE_DASH,
	parseFlagArgv,
} from './utils';

type BreakIteration = false;

type onValueCallbackType = (
	value?: string,
	index?: number,
) => void | BreakIteration;

type onFlag = (
	name: string,
	value: string | undefined,
	index: number,
) => void | BreakIteration | onValueCallbackType;

type onArgument = (
	argument: string,
	index: number,
) => void | BreakIteration;

type onEndOfFlags = (
	args: string[],
	index: number,
) => void

export const argvIterator = (
	argv: string[],
	callbacks: {
		onFlag?: onFlag;
		onArgument?: onArgument;
		onEoF?: onEndOfFlags;
	},
) => {
	let onValueCallback: undefined | onValueCallbackType;

	const triggerCallback = (
		value?: string,
		index?: number,
	) => {
		if (!onValueCallback) {
			return true;
		}

		const result = onValueCallback(value, index);
		onValueCallback = undefined;
		return result;
	};

	ARGV_ITERATION:
	for (let i = 0; i < argv.length; i += 1) {
		const argvElement = argv[i];

		// onEndOfFlags
		if (argvElement === DOUBLE_DASH) {
			if (triggerCallback() === false) {
				break;
			}

			const remaining = argv.slice(i + 1);
			callbacks.onEoF?.(remaining, i);
			break;
		}

		const parsedFlag = parseFlagArgv(argvElement);

		if (parsedFlag) {
			if (triggerCallback() === false) {
				break;
			}

			if (!callbacks.onFlag) {
				continue;
			}

			const [flagName, flagValue, isAlias] = parsedFlag;

			if (isAlias) {
				for (let j = 0; j < flagName.length; j += 1) {
					const alias = flagName[j];
					const isLastAlias = j === flagName.length - 1;
					const result = callbacks.onFlag(
						alias,
						isLastAlias ? flagValue : undefined,
						i,
					);

					if (result === false) {
						break ARGV_ITERATION;
					} else if (typeof result === 'function') {
						onValueCallback = result;
					}
				}
			} else {
				const result = callbacks.onFlag(
					flagName,
					flagValue,
					i,
				);

				if (result === false) {
					break;
				} else if (typeof result === 'function') {
					onValueCallback = result;
				}
			}
		} else {
			const result = triggerCallback(argvElement, i);
			if (
				result === false
				|| (
					result === true // no callback set
					&& callbacks.onArgument?.(argvElement, i) === false
				)
			) {
				break;
			}
		}
	}

	triggerCallback();
};
