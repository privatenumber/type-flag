import type {
	Flags,
	FlagTypeOrSchema,
	ParsedFlags,
	TypeFlag,
} from './types';
import {
	DOUBLE_DASH,
	kebabToCamel,
	createFlagsObject,
	mapAliases,
	parseFlagArgv,
	normalizeBoolean,
	applyParser,
	setDefaultFlagValues,
	parseFlagType,
	hasOwn,
	getOwn,
} from './utils';

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
	const parsed: ParsedFlags<Record<string, unknown>> = {
		flags: createFlagsObject(schemas),
		unknownFlags: {},
		_: Object.assign([], {
			[DOUBLE_DASH]: [],
		}),
	};

	let setValueOnPreviousFlag: undefined | ((value?: string | boolean) => void);

	const setKnown = (
		flagName: string,
		flagSchema: FlagTypeOrSchema,
		flagValue: any,
	) => {
		const [flagType] = parseFlagType(flagSchema);

		flagValue = normalizeBoolean(flagType, flagValue);

		setValueOnPreviousFlag = (value) => {
			const parsedValue = applyParser(flagType, value || '');
			const flagsArray = parsed.flags[flagName];
			if (Array.isArray(flagsArray)) {
				flagsArray.push(parsedValue);
			} else {
				parsed.flags[flagName] = parsedValue;
			}

			setValueOnPreviousFlag = undefined;
		};

		if (flagValue !== undefined) {
			setValueOnPreviousFlag(flagValue);
		}
	};

	const setUnknown = (
		flagName: string,
		flagValue: any,
	) => {
		if (!hasOwn(parsed.unknownFlags, flagName)) {
			parsed.unknownFlags[flagName] = [];
		}

		if (flagValue === undefined) {
			flagValue = true;
		}

		parsed.unknownFlags[flagName].push(flagValue);
	};

	for (let i = 0; i < argv.length; i += 1) {
		const argvElement = argv[i];

		if (argvElement === DOUBLE_DASH) {
			const remainingArgs = argv.slice(i + 1);
			parsed._[DOUBLE_DASH] = remainingArgs;
			parsed._.push(...remainingArgs);
			break;
		}

		const parsedFlag = parseFlagArgv(argvElement);
		if (parsedFlag) {
			if (setValueOnPreviousFlag) {
				setValueOnPreviousFlag();
			}

			const [flagName, flagValue, isAlias] = parsedFlag;

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

			let name = flagName;
			let flagSchema = getOwn(schemas, flagName);
			if (!flagSchema) {
				const camelized = kebabToCamel(flagName);
				flagSchema = getOwn(schemas, camelized);

				if (flagSchema) {
					name = camelized;
				}
			}

			if (flagSchema) {
				setKnown(name, flagSchema, flagValue);
			} else if (ignoreUnknown) {
				parsed._.push(argvElement);
			} else {
				setUnknown(flagName, flagValue);
			}
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
