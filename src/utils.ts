import type {
	TypeFunction,
	FlagTypeOrSchema,
	Flags,
	FlagSchema,
} from './types';

const camelCasePattern = /\B([A-Z])/g;
const camelToKebab = (string: string) => string.replaceAll(camelCasePattern, '-$1').toLowerCase();

const { hasOwnProperty } = Object.prototype;
export const hasOwn = (
	object: unknown,
	property: PropertyKey,
) => hasOwnProperty.call(object, property);

export const parseFlagType = (
	flagSchema: FlagTypeOrSchema,
): [parser: TypeFunction, isArray: boolean] => {
	if (typeof flagSchema === 'function') {
		return [flagSchema, false];
	}

	if (Array.isArray(flagSchema)) {
		return [flagSchema[0], true];
	}

	return parseFlagType((flagSchema as FlagSchema).type);
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
	const errorPrefix = `Flag name "${flagName}"`;

	if (flagName.length === 0) {
		throw new Error(`${errorPrefix} cannot be empty`);
	}

	const hasReservedCharacter = flagName.match(reservedCharactersPattern);
	if (hasReservedCharacter) {
		throw new Error(`${errorPrefix} cannot contain "${hasReservedCharacter?.[0]}"`);
	}
};

type FlagParsingData = [
	values: unknown[],
	parser: TypeFunction,
	isArray: boolean,
	schema: FlagTypeOrSchema,
];

type FlagRegistry = {
	[flagName: string]: FlagParsingData;
};

const setFlag = (
	registry: FlagRegistry,
	flagName: string,
	data: FlagParsingData,
) => {
	if (hasOwn(registry, flagName)) {
		throw new Error(`Duplicate flags named "${flagName}"`);
	}

	registry[flagName] = data;
};

export const createRegistry = (
	schemas: Flags,
) => {
	const registry: FlagRegistry = {};

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

		setFlag(registry, flagName, flagData);

		const kebabCasing = camelToKebab(flagName);
		if (flagName !== kebabCasing) {
			setFlag(registry, kebabCasing, flagData);
		}

		if ('alias' in schema && typeof schema.alias === 'string') {
			const { alias } = schema;
			const errorPrefix = `Flag alias "${alias}" for flag "${flagName}"`;

			if (flagName.length === 1) {
				throw new Error(`${errorPrefix} cannot be defined for a single-character flag`);
			}

			if (alias.length === 0) {
				throw new Error(`${errorPrefix} cannot be empty`);
			}

			if (alias.length > 1) {
				throw new Error(`${errorPrefix} must be a single character`);
			}

			setFlag(registry, alias, flagData);
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
