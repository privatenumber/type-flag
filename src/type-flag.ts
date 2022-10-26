import type {
	Flags,
	FlagTypeOrSchema,
	TypeFlag,
} from './types';
import {
	toCamelCase,
	createFlagsObject,
	mapAliases,
	parseFlag,
	getDefaultFromTypeWithValue,
	validateFlags,
	getFlagType,
} from './utils';

const isAliasPattern = /^-[\da-z]+/i;
const isFlagPattern = /^--[\w-]{2,}/;
const END_OF_FLAGS = '--';

enum Type {
	Flag = 'flag',
	Alias = 'alias',
	Argument = 'argument',
}

/**
type-flag: typed argv parser

@param schemas - A map of flag names to flag schemas
@param argv - Optional argv array of strings. [Default: process.argv.slice(2)]
@returns Parsed argv flags

@example
```ts
import typeFlag from 'type-flag';

const parsed = typeFlag({
	foo: Boolean,
	bar: {
		type: Number,
		default: 8
	}
})
```
*/
export function typeFlag<Schemas extends Flags>(
	schemas: Schemas,
	argv: string[] = process.argv.slice(2),
	options: {
		ignoreUnknown?: boolean;
		earlyTermination?: (argvElement: {
			type: Type;
			value: string;
		}) => boolean;
	} = {},
) {
	const {
		ignoreUnknown,
		earlyTermination,
	} = options;
	const aliasesMap = mapAliases(schemas);
	const parsed: TypeFlag<Schemas> = {
		flags: createFlagsObject(schemas),
		unknownFlags: {},
		_: Object.assign([], {
			[END_OF_FLAGS]: [],
		}),
	};

	let setValueOnPreviousFlag: undefined | ((value?: string | boolean) => void);

	const setKnown = (
		flagName: keyof Schemas,
		flagSchema: FlagTypeOrSchema,
		flagValue: any,
	) => {
		const flagType = getFlagType(flagName as string, flagSchema);

		flagValue = getDefaultFromTypeWithValue(flagType, flagValue);

		if (flagValue !== undefined && !Number.isNaN(flagValue)) {
			if (Array.isArray(parsed.flags[flagName])) {
				parsed.flags[flagName].push(flagType(flagValue));
			} else {
				parsed.flags[flagName] = flagType(flagValue);
			}
		} else {
			setValueOnPreviousFlag = (value) => {
				if (Array.isArray(parsed.flags[flagName])) {
					parsed.flags[flagName].push(flagType(getDefaultFromTypeWithValue(flagType, value || '')));
				} else {
					parsed.flags[flagName] = flagType(getDefaultFromTypeWithValue(flagType, value || ''));
				}

				setValueOnPreviousFlag = undefined;
			};
		}
	};

	const setUnknown = (
		flagName: string,
		flagValue: any,
	) => {
		if (!(flagName in parsed.unknownFlags)) {
			parsed.unknownFlags[flagName] = [];
		}

		if (flagValue !== undefined) {
			parsed.unknownFlags[flagName].push(flagValue);
		} else {
			setValueOnPreviousFlag = (value = true) => {
				parsed.unknownFlags[flagName].push(value);
				setValueOnPreviousFlag = undefined;
			};
		}
	};

	for (let i = 0; i < argv.length; i += 1) {
		const argvElement = argv[i];

		if (argvElement === END_OF_FLAGS) {
			const remainingArgs = argv.slice(i + 1);
			parsed._[END_OF_FLAGS] = remainingArgs;
			parsed._.push(...remainingArgs);
			break;
		}

		const type = (
			isAliasPattern.test(argvElement)
				? Type.Alias
				: (
					isFlagPattern.test(argvElement)
						? Type.Flag
						: Type.Argument
				)
		);

		if (setValueOnPreviousFlag) {
			setValueOnPreviousFlag(
				type === Type.Argument
					? argvElement
					: undefined,
			);

			if (type === Type.Argument) {
				// Skip because it was actually a value, not an argument
				continue;
			}
		}

		if (earlyTermination) {
			const shouldTerminate = earlyTermination({ type, value: argvElement });
			if (shouldTerminate) {
				break;
			}
		}

		if (type === Type.Argument) {
			parsed._.push(argvElement);
		} else {
			const parsedFlag = parseFlag(argvElement);
			const { flagValue } = parsedFlag;
			let { flagName } = parsedFlag;

			if (type === Type.Alias) {
				for (let j = 0; j < flagName.length; j += 1) {
					const alias = flagName[j];
					const hasAlias = aliasesMap.get(alias);
					const isLastAlias = j === flagName.length - 1;

					if (hasAlias) {
						setKnown(
							hasAlias.name,
							hasAlias.schema,
							isLastAlias ? flagValue : true,
						);
					} else if (ignoreUnknown) {
						parsed._.push(argvElement);
					} else {
						setUnknown(alias, isLastAlias ? flagValue : true);
					}
				}
				continue;
			}

			let flagSchema = schemas[flagName];

			if (!flagSchema) {
				const camelized = toCamelCase(flagName);
				flagSchema = schemas[camelized];

				if (flagSchema) {
					flagName = camelized;
				}
			}

			if (!flagSchema) {
				if (ignoreUnknown) {
					parsed._.push(argvElement);
				} else {
					setUnknown(flagName, flagValue);
				}
				continue;
			}

			setKnown(flagName, flagSchema, flagValue);
		}
	}

	if (setValueOnPreviousFlag) {
		setValueOnPreviousFlag();
	}

	validateFlags(schemas, parsed.flags);

	type Parsed = typeof parsed;
	return parsed as {
		// This exposes the content of "TypeFlag<T>" in type hints
		[Key in keyof Parsed]: Parsed[Key];
	};
}
