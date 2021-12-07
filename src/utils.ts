import assert from 'assert';
import type {
	TypeFunction,
	FlagSchema,
	Flags,
	InferFlagType,
	FlagTypeOrSchema,
} from './types';

const kebabCasePattern = /-(\w)/g;
export const toCamelCase = (string: string) => string.replace(
	kebabCasePattern,
	(_, afterHyphenCharacter) => afterHyphenCharacter.toUpperCase(),
);

const camelCasePattern = /\B([A-Z])/g;
const toKebabCase = (string: string) => string.replace(camelCasePattern, '-$1').toLowerCase();

const { stringify } = JSON;

const { hasOwnProperty } = Object.prototype;
const hasOwn = (object: any, property: string | symbol) => hasOwnProperty.call(object, property);

const flagPrefixPattern = /^--?/;
const valueDelimiterPattern = /[.:=]/;

export const parseFlag = (flagArgv: string) => {
	let flagName = flagArgv.replace(flagPrefixPattern, '');
	let flagValue;
	const hasValueDalimiter = flagName.match(valueDelimiterPattern);

	if (hasValueDalimiter?.index) {
		const equalIndex = hasValueDalimiter.index;
		flagValue = flagName.slice(equalIndex + 1);
		flagName = flagName.slice(0, equalIndex);
	}

	return {
		flagName,
		flagValue,
	};
};

const reservedCharactersPattern = /[\s.:=]/;

const validateFlagName = <Schemas extends Flags>(
	schemas: Schemas,
	flagName: string,
) => {
	const errorPrefix = `Invalid flag name ${stringify(flagName)}:`;
	assert(flagName.length > 0, `${errorPrefix} flag name cannot be empty}`);
	assert(flagName.length !== 1, `${errorPrefix} single characters are reserved for aliases`);

	const hasReservedCharacter = flagName.match(reservedCharactersPattern);
	assert(!hasReservedCharacter, `${errorPrefix} flag name cannot contain the character ${stringify(hasReservedCharacter?.[0])}`);

	let checkDifferentCase;

	if (kebabCasePattern.test(flagName)) {
		checkDifferentCase = toCamelCase(flagName);
	} else if (camelCasePattern.test(flagName)) {
		checkDifferentCase = toKebabCase(flagName);
	}

	if (checkDifferentCase) {
		assert(
			!hasOwn(schemas, checkDifferentCase),
			`${errorPrefix} collides with flag ${stringify(checkDifferentCase)}`,
		);
	}
};

export function mapAliases<Schemas extends Flags>(
	schemas: Schemas,
) {
	const aliases = new Map<string, {
		name: string;
		schema: FlagSchema;
	}>();

	for (const flagName in schemas) {
		if (!hasOwn(schemas, flagName)) {
			continue;
		}

		validateFlagName(schemas, flagName);

		const schema = schemas[flagName] as FlagSchema;
		if (schema && typeof schema === 'object') {
			const { alias } = schema;
			if (alias) {
				assert(alias.length > 0, `Invalid flag alias ${stringify(flagName)}: flag alias cannot be empty`);
				assert(alias.length === 1, `Invalid flag alias ${stringify(flagName)}: flag aliases can only be a single-character`);
				assert(
					!aliases.has(alias),
					`Flag collision: Alias "${alias}" is already used`,
				);

				aliases.set(alias, {
					name: flagName,
					schema,
				});
			}
		}
	}

	return aliases;
}

const isArrayType = (schema: FlagTypeOrSchema) => {
	if (typeof schema === 'function') {
		return false;
	}

	return Array.isArray(schema) || Array.isArray(schema.type);
};

export const createFlagsObject = <Schemas extends Flags>(
	schema: Schemas,
) => {
	const flags: Record<string, any> = {};

	for (const flag in schema) {
		if (hasOwn(schema, flag)) {
			flags[flag] = isArrayType(schema[flag]) ? [] : undefined;
		}
	}

	return flags as {
		[flag in keyof Schemas]: InferFlagType<Schemas[flag]>;
	};
};

export const getDefaultFromTypeWithValue = (
	typeFunction: TypeFunction,
	value: any,
) => {
	if (typeFunction === Number && value === '') {
		return Number.NaN;
	}

	if (typeFunction === Boolean) {
		return (value !== 'false');
	}

	return value;
};

export const validateFlags = <Schemas extends Flags>(
	schemas: Schemas,
	flags: Record<keyof Schemas, any>,
) => {
	for (const flagName in schemas) {
		if (!hasOwn(schemas, flagName)) {
			continue;
		}

		const schema = schemas[flagName];

		if (!schema) {
			continue;
		}

		const value = flags[flagName];
		if (
			value !== undefined
			&& !(Array.isArray(value) && value.length === 0)
		) {
			continue;
		}

		if ('default' in schema) {
			let defaultValue = schema.default;

			if (typeof defaultValue === 'function') {
				defaultValue = defaultValue();
			}

			flags[flagName] = defaultValue;
		} else if (
			('required' in schema)
			&& schema.required
		) {
			throw new Error(`Missing required option "--${flagName}"`);
		}
	}
};
