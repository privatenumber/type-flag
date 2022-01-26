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
) {
	const aliasesMap = mapAliases(schemas);
	const parsed: TypeFlag<Schemas> = {
		flags: createFlagsObject(schemas),
		unknownFlags: {},
		_: Object.assign([], {
			[END_OF_FLAGS]: [],
		}),
	};

	let expectingValue: undefined | ((value?: string | boolean) => void);

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
			expectingValue = (value) => {
				if (Array.isArray(parsed.flags[flagName])) {
					parsed.flags[flagName].push(flagType(getDefaultFromTypeWithValue(flagType, value || '')));
				} else {
					parsed.flags[flagName] = flagType(getDefaultFromTypeWithValue(flagType, value || ''));
				}

				expectingValue = undefined;
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
			expectingValue = (value = true) => {
				parsed.unknownFlags[flagName].push(value);
				expectingValue = undefined;
			};
		}
	};

	for (let i = 0; i < argv.length; i += 1) {
		const argvElement = argv[i];

		if (argvElement === END_OF_FLAGS) {
			const endOfFlags = argv.slice(i + 1);
			parsed._[END_OF_FLAGS] = endOfFlags;
			parsed._.push(...endOfFlags);
			break;
		}

		const isAlias = isAliasPattern.test(argvElement);
		const isFlag = isFlagPattern.test(argvElement);

		if (isFlag || isAlias) {
			if (expectingValue) {
				expectingValue();
			}

			const parsedFlag = parseFlag(argvElement);
			const { flagValue } = parsedFlag;
			let { flagName } = parsedFlag;

			if (isAlias) {
				for (let j = 0; j < flagName.length; j += 1) {
					const alias = flagName[j];
					const hasAlias = aliasesMap.get(alias);
					const isLast = j === flagName.length - 1;

					if (hasAlias) {
						setKnown(
							hasAlias.name,
							hasAlias.schema,
							isLast ? flagValue : true,
						);
					} else {
						setUnknown(alias, isLast ? flagValue : true);
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
				setUnknown(flagName, flagValue);
				continue;
			}

			setKnown(flagName, flagSchema, flagValue);
		} else if (expectingValue) { // Not a flag, but expecting a value
			expectingValue(argvElement);
		} else { // Unexpected value
			parsed._.push(argvElement);
		}
	}

	if (expectingValue) {
		expectingValue();
	}

	validateFlags(schemas, parsed.flags);

	type Parsed = typeof parsed;
	return parsed as {
		// This exposes the content of "TypeFlag<T>" in type hints
		[Key in keyof Parsed]: Parsed[Key];
	};
}
