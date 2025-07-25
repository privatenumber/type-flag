import type {
	TypeFunction,
	FlagTypeOrSchema,
	Flags,
} from './types';

const { stringify } = JSON;

/**
 * A fast way to convert camelCase to kebab-case.
 * This is faster than using a regex with replace().
 */
const camelToKebab = (string: string) => {
	let result = '';
	for (let i = 0; i < string.length; i += 1) {
		const char = string[i];
		const charCode = char.charCodeAt(0);

		// 65-90 is A-Z
		if (charCode >= 65 && charCode <= 90) {
			result += `${i > 0 ? '-' : ''}${String.fromCharCode(charCode + 32)}`;
		} else {
			result += char;
		}
	}
	return result;
};

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

export const parseFlagType = (flagSchema: FlagTypeOrSchema): [parser: TypeFunction, isArray: boolean] => {
	let schema = flagSchema;
	while (typeof schema !== 'function' && !isReadonlyArray(schema)) {
		schema = schema.type;
	}

	if (typeof schema === 'function') {
		return [schema, false];
	}

	// It must be a ReadonlyArray now
	return [schema[0], true];
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

	// This is faster than a regex for finding the first reserved character
	for (let i = 0; i < flagName.length; i += 1) {
		const char = flagName[i];
		if (
			char === ' '
			|| char === '.'
			|| char === ':'
			|| char === '='
		) {
			throw new Error(`${errorPrefix} cannot contain ${stringify(char)}`);
		}
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

	const flagNames = Object.keys(schemas);
	for (let i = 0; i < flagNames.length; i += 1) {
		const flagName = flagNames[i];
		validateFlagName(flagName);

		const schema = schemas[flagName];
		const [parser, isArray] = parseFlagType(schema);
		const flagData: FlagParsingData = [[], parser, isArray, schema];

		setFlag(flagName, flagData);

		const kebabCasing = camelToKebab(flagName);
		if (flagName !== kebabCasing) {
			setFlag(kebabCasing, flagData);
		}

		if (
			'alias' in schema
			&& typeof schema.alias === 'string'
		) {
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

export const finalizeFlags = (schemas: Flags, registry: FlagRegistry) => {
	const flags: Record<string, unknown> = {};
	const flagNames = Object.keys(schemas);

	for (let i = 0; i < flagNames.length; i += 1) {
		const flagName = flagNames[i];
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
