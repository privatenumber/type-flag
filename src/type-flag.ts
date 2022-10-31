import type {
	Flags,
	FlagTypeOrSchema,
	TypeFlag,
} from './types';
import {
	DOUBLE_DASH,
	kebabToCamel,
	createFlagsObject,
	mapAliases,
	normalizeBoolean,
	applyParser,
	setDefaultFlagValues,
	parseFlagType,
	hasOwn,
	getOwn,
} from './utils';
import { argvIterator } from './argv-iterator';

type ParsedFlags = {
	flags: Record<string, unknown>;
	unknownFlags: Record<string, (string | boolean)[]>;
	_: string[] & {
		[DOUBLE_DASH]: string[];
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
			[DOUBLE_DASH]: [],
		}),
	};

	const setKnown = (
		flagName: string,
		flagSchema: FlagTypeOrSchema,
		explicitValue?: string,
	) => {
		const [flagType] = parseFlagType(flagSchema);
		const flagValue = normalizeBoolean(flagType, explicitValue);

		const setValueOnPreviousFlag = (value?: string | boolean) => {
			const parsedValue = applyParser(flagType, value || '');
			const flagsArray = parsed.flags[flagName];
			if (Array.isArray(flagsArray)) {
				flagsArray.push(parsedValue);
			} else {
				parsed.flags[flagName] = parsedValue;
			}
		};

		return (
			flagValue === undefined
				? setValueOnPreviousFlag
				: setValueOnPreviousFlag(flagValue)
		);
	};

	const setUnknown = (
		flagName: string,
		explicitValue?: string,
	) => {
		if (!hasOwn(parsed.unknownFlags, flagName)) {
			parsed.unknownFlags[flagName] = [];
		}

		parsed.unknownFlags[flagName].push(
			explicitValue === undefined ? true : explicitValue,
		);
	};

	argvIterator(argv, {
		onFlag(name, value, index) {
			if (name.length === 1) {
				const hasAlias = getOwn(aliasesMap, name);
				if (hasAlias) {
					return setKnown(
						hasAlias.name,
						hasAlias.schema,
						value,
					);
				} if (ignoreUnknown) {
					parsed._.push(argv[index]);
				} else {
					setUnknown(name, value);
				}
			} else {
				let flagSchema = getOwn(schemas, name);
				if (!flagSchema) {
					const camelized = kebabToCamel(name);
					flagSchema = getOwn(schemas, camelized);

					if (flagSchema) {
						name = camelized;
					}
				}

				if (flagSchema) {
					return setKnown(name, flagSchema, value);
				} if (ignoreUnknown) {
					parsed._.push(argv[index]);
				} else {
					setUnknown(name, value);
				}
			}
		},

		onArgument(argvElement) {
			parsed._.push(argvElement);
		},

		// merge with onArgument?
		onEoF(args) {
			parsed._.push(...args);
			parsed._[DOUBLE_DASH] = args;
		},
	});

	setDefaultFlagValues(schemas, parsed.flags);

	type Result = TypeFlag<Schemas>;
	return parsed as {
		// This exposes the content of "TypeFlag<T>" in type hints
		[Key in keyof Result]: Result[Key];
	};
};
