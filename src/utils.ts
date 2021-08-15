import assert from 'assert';
import type {
	TypeFunction,
	FlagSchema,
	Flags,
	ParsedFlags,
	InferFlagType,
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

	if (kebabCasePattern.test(flagName)) {
		assert(
			!hasOwn(schemas, toCamelCase(flagName)),
			`${errorPrefix} camelCase version of this name already exists`,
		);
	} else if (camelCasePattern.test(flagName)) {
		assert(
			!hasOwn(schemas, toKebabCase(flagName)),
			`${errorPrefix} kebab-case version of this name already exists`,
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

	for (const name in schemas) {
		if (!hasOwn(schemas, name)) {
			continue;
		}

		validateFlagName(schemas, name);

		const schema = schemas[name];
		if (schema && typeof schema === 'object') {
			const { alias } = schema;
			if (alias) {
				assert(alias.length > 0, `Invalid flag alias ${stringify(name)}: flag alias cannot be empty`);
				assert(alias.length === 1, `Invalid flag alias ${stringify(name)}: flag aliases can only be a single-character`);

				assert(
					!aliases.has(alias),
					`Flag collision: Alias "${alias}" is already used`,
				);

				aliases.set(alias, {
					name,
					schema,
				});
			}
		}
	}

	return aliases;
}

export const createFlagsObject = <Schemas extends Flags>(schema: Flags) => {
	const flags: ParsedFlags = {};

	for (const flag in schema) {
		if (hasOwn(schema, flag)) {
			flags[flag] = [];
		}
	}

	return flags as {
		[flag in keyof Schemas]: InferFlagType<Schemas[flag]>[];
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
