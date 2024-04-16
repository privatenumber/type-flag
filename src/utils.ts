import type {
	TypeFunction,
	FlagTypeOrSchema,
	Flags,
} from './types';

const { stringify } = JSON;
const camelCasePattern = /\B([A-Z])/g;
const camelToKebab = (string: string) => string.replaceAll(camelCasePattern, '-$1').toLowerCase();

const { hasOwnProperty } = Object.prototype;
export const hasOwn = (
	object: unknown,
	property: PropertyKey,
) => hasOwnProperty.call(object, property);

/**
 * Default Array.isArray doesn't support type-narrowing
 * on readonly arrays.
 *
 * https://stackoverflow.com/a/56249765/911407
 */
const isReadonlyArray = (
	array: readonly unknown[] | unknown,
): array is readonly unknown[] => Array.isArray(array);

export const parseFlagType = (
	flagSchema: FlagTypeOrSchema,
): [parser: TypeFunction, isArray: boolean] => {
	if (typeof flagSchema === 'function') {
		return [flagSchema, false];
	}

	if (isReadonlyArray(flagSchema)) {
		return [flagSchema[0], true];
	}

	return parseFlagType(flagSchema.type);
};

export const normalizeBoolean = <T>(
	parser: TypeFunction,
	value: T,
) => {
	if (parser === Boolean) {
		return value !== 'false';
	}

	return value;
};

export const applyParser = (
	typeFunction: TypeFunction,
	value: unknown,
) => {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeFunction === Number && value === '') {
		return Number.NaN;
	}

	return typeFunction(value);
};

const reservedCharactersPattern = /[\s.:=]/;

const validateFlagName = (
	flagName: string,
) => {
	const errorPrefix = `Flag name ${stringify(flagName)}`;

	if (flagName.length === 0) {
		throw new Error(`${errorPrefix} cannot be empty`);
	}

	if (flagName.length === 1) {
		throw new Error(`${errorPrefix} must be longer than a character`);
	}

	const hasReservedCharacter = flagName.match(reservedCharactersPattern);
	if (hasReservedCharacter) {
		throw new Error(`${errorPrefix} cannot contain ${stringify(hasReservedCharacter?.[0])}`);
	}
};

type FlagParsingData = [
	values: unknown[],
	parser: TypeFunction,
	isArray: boolean,
	schema: FlagTypeOrSchema
];

type FlagRegistry = {
	[flagName: string]: FlagParsingData;
};

export const createRegistry = (
	schemas: Flags,
) => {
	const registry: FlagRegistry = {};

	const setFlag = (
		flagName: string,
		data: FlagParsingData,
	) => {
		if (hasOwn(registry, flagName)) {
			throw new Error(`Duplicate flags named ${stringify(flagName)}`);
		}

		registry[flagName] = data;
	};

	for (const flagName in schemas) {
		if (!hasOwn(schemas, flagName)) {
			continue;
		}
		validateFlagName(flagName);

		const schema = schemas[flagName];
		const flagData: FlagParsingData = [
			[],
			...parseFlagType(schema),
			schema,
		];

		setFlag(flagName, flagData);

		const kebabCasing = camelToKebab(flagName);
		if (flagName !== kebabCasing) {
			setFlag(kebabCasing, flagData);
		}

		if ('alias' in schema && typeof schema.alias === 'string') {
			const { alias } = schema;
			const errorPrefix = `Flag alias ${stringify(alias)} for flag ${stringify(flagName)}`;

			if (alias.length === 0) {
				throw new Error(`${errorPrefix} cannot be empty`);
			}

			if (alias.length > 1) {
				throw new Error(`${errorPrefix} must be a single character`);
			}

			setFlag(alias, flagData);
		}
	}

	return registry;
};

export const finalizeFlags = (
	schemas: Flags,
	registry: FlagRegistry,
) => {
	const flags: Record<string, unknown> = {};

	for (const flagName in schemas) {
		if (!hasOwn(schemas, flagName)) {
			continue;
		}

		const [values, , isArray, schema] = registry[flagName];
		if (
			values.length === 0
			&& 'default' in schema
		) {
			let { default: defaultValue } = schema;
			if (typeof defaultValue === 'function') {
				defaultValue = defaultValue();
			}
			flags[flagName] = defaultValue;
		} else {
			flags[flagName] = isArray ? values : values.pop();
		}
	}

	return flags;
};
