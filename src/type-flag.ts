import type {
	Flags,
	FlagTypeOrSchema,
	TypeFlag,
} from './types';
import {
	kebabToCamel,
	createFlagsObject,
	mapAliases,
	parseFlag,
	getDefaultFromTypeWithValue,
	setDefaultFlagValues,
	parseFlagType,
	getOwn,
} from './utils';

const isAliasPattern = /^-[\da-z]+/i;
const isFlagPattern = /^--[\w-]{2,}/;
const END_OF_FLAGS = '--';

type ParsedFlags = {
	flags: Record<string, unknown>;
	unknownFlags: Record<string, (string | boolean)[]>;
	_: string[] & {
		'--': string[];
	};
};

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
export const typeFlag = <Schemas extends Flags>(
	schemas: Schemas,
	argv: string[] = process.argv.slice(2),
	options: {
		ignoreUnknown?: boolean;
	} = {},
) => {
	const { ignoreUnknown } = options;
	const aliasesMap = mapAliases(schemas);
	const parsed: ParsedFlags = {
		flags: createFlagsObject(schemas),
		unknownFlags: {},
		_: Object.assign([], {
			[END_OF_FLAGS]: [],
		}),
	};

	let setValueOnPreviousFlag: undefined | ((value?: string | boolean) => void);

	const setKnown = (
		flagName: string,
		flagSchema: FlagTypeOrSchema,
		flagValue: any,
	) => {
		const [flagType] = parseFlagType(flagSchema);

		flagValue = getDefaultFromTypeWithValue(flagType, flagValue);

		if (flagValue !== undefined && !Number.isNaN(flagValue)) {
			const a = parsed.flags[flagName];
			if (Array.isArray(a)) {
				a.push(flagType(flagValue));
			} else {
				parsed.flags[flagName] = flagType(flagValue);
			}
		} else {
			setValueOnPreviousFlag = (value) => {
				const a = parsed.flags[flagName];
				if (Array.isArray(a)) {
					a.push(flagType(getDefaultFromTypeWithValue(flagType, value || '')));
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

		if (flagValue === undefined) {
			flagValue = true;
		}

		parsed.unknownFlags[flagName].push(flagValue);
	};

	for (let i = 0; i < argv.length; i += 1) {
		const argvElement = argv[i];

		if (argvElement === END_OF_FLAGS) {
			const remainingArgs = argv.slice(i + 1);
			parsed._[END_OF_FLAGS] = remainingArgs;
			parsed._.push(...remainingArgs);
			break;
		}

		const isAlias = isAliasPattern.test(argvElement);
		const isFlag = isFlagPattern.test(argvElement);

		if (isFlag || isAlias) {
			if (setValueOnPreviousFlag) {
				setValueOnPreviousFlag();
			}

			const parsedFlag = parseFlag(argvElement);
			const { flagValue } = parsedFlag;
			let { flagName } = parsedFlag;

			if (isAlias) {
				for (let j = 0; j < flagName.length; j += 1) {
					const alias = flagName[j];
					const hasAlias = getOwn(aliasesMap, alias);
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

			let flagSchema = getOwn(schemas, flagName);

			if (!flagSchema) {
				const camelized = kebabToCamel(flagName);
				flagSchema = getOwn(schemas, camelized);

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
		} else if (setValueOnPreviousFlag) { // Not a flag, but expecting a value
			setValueOnPreviousFlag(argvElement);
		} else { // Unexpected value
			parsed._.push(argvElement);
		}
	}

	if (setValueOnPreviousFlag) {
		setValueOnPreviousFlag();
	}

	setDefaultFlagValues(schemas, parsed.flags);

	type Result = TypeFlag<Schemas>;
	return parsed as {
		// This exposes the content of "TypeFlag<T>" in type hints
		[Key in keyof Result]: Result[Key];
	};
};
