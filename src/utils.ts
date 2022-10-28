import type {
	TypeFunction,
	FlagSchema,
	FlagTypeOrSchema,
	Flags,
} from './types';

const { stringify } = JSON;

const kebabCasePattern = /-(\w)/g;
export const kebabToCamel = (string: string) => string.replace(
	kebabCasePattern,
	(_, afterHyphenCharacter) => afterHyphenCharacter.toUpperCase(),
);

const camelCasePattern = /\B([A-Z])/g;
const camelToKebab = (string: string) => string.replace(camelCasePattern, '-$1').toLowerCase();

const { hasOwnProperty } = Object.prototype;
const hasOwn = (object: any, property: PropertyKey) => hasOwnProperty.call(object, property);

export const getOwn = <ObjectType>(
	object: ObjectType,
	property: keyof ObjectType,
) => (hasOwn(object, property) ? object[property] : undefined);

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

const validateFlagName = (
	schemas: Flags,
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
		throw new Error(`${errorPrefix} cannot contain the character ${stringify(hasReservedCharacter?.[0])}`);
	}

	let checkDifferentCase: string | undefined;

	if (kebabCasePattern.test(flagName)) {
		checkDifferentCase = kebabToCamel(flagName);
	} else if (camelCasePattern.test(flagName)) {
		checkDifferentCase = camelToKebab(flagName);
	}

	if (checkDifferentCase && hasOwn(schemas, checkDifferentCase)) {
		throw new Error(`${errorPrefix} collides with flag ${stringify(checkDifferentCase)}`);
	}
};

type Aliases = {
	[alias: string]: {
		name: string;
		schema: FlagSchema;
	};
};

export const mapAliases = (
	schemas: Flags,
) => {
	const aliases: Aliases = {};

	// eslint-disable-next-line guard-for-in
	for (const name in schemas) {
		const schema = getOwn(schemas, name) as FlagSchema;

		// has-own check
		if (!schema) {
			continue;
		}

		validateFlagName(schemas, name);

		const { alias } = schema;
		if (typeof alias === 'string') {
			const errorPrefix = `Flag alias ${stringify(alias)} for flag ${stringify(name)}`;

			if (alias.length === 0) {
				throw new Error(`${errorPrefix} cannot be empty`);
			}

			if (alias.length > 1) {
				throw new Error(`${errorPrefix} must be a single character`);
			}

			if (hasOwn(aliases, alias)) {
				throw new Error(`${errorPrefix} is already used`);
			}

			aliases[alias] = {
				name,
				schema,
			};
		}
	}

	return aliases;
};

/**
 * Default Array.isArray doesn't support type-narrowing
 * on readonly arrays.
 *
 * https://stackoverflow.com/a/56249765/911407
 */
const isReadonlyArray = (
	array: readonly any[] | any,
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

export const createFlagsObject = (
	schemas: Flags,
) => {
	const flags: Record<string, unknown> = {};

	for (const flag in schemas) {
		if (hasOwn(schemas, flag)) {
			const [, isArray] = parseFlagType(schemas[flag]);
			flags[flag] = isArray ? [] : undefined;
		}
	}

	return flags;
};

export const getDefaultFromTypeWithValue = (
	typeFunction: TypeFunction,
	value: any,
) => {
	if (typeFunction === Boolean) {
		return value !== 'false';
	}

	if (typeFunction === Number && value === '') {
		return Number.NaN;
	}

	return value;
};

export const setDefaultFlagValues = (
	schemas: Flags,
	flags: Record<string, any>,
) => {
	// eslint-disable-next-line guard-for-in
	for (const flagName in schemas) {
		const schema = getOwn(schemas, flagName);

		// has-own check
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
		}
	}
};
