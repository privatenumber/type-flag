import type {
	TypeFunction,
	FlagSchema,
	FlagTypeOrSchema,
	Flags,
	InferFlagType,
} from './types';

// https://stackoverflow.com/a/56249765/911407
declare global {
	interface ArrayConstructor {
		isArray(array: ReadonlyArray<any> | any): array is ReadonlyArray<any>;
	}
}

const kebabCasePattern = /-(\w)/g;
export const kebabToCamel = (string: string) => string.replace(
	kebabCasePattern,
	(_, afterHyphenCharacter) => afterHyphenCharacter.toUpperCase(),
);

const camelCasePattern = /\B([A-Z])/g;
const camelToKebab = (string: string) => string.replace(camelCasePattern, '-$1').toLowerCase();

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
			if (typeof alias === 'string') {
				if (alias.length === 0) {
					throw new Error(`Flag alias for ${stringify(flagName)} cannot be empty`);
				}

				if (alias.length > 1) {
					throw new Error(`Flag alias for ${stringify(flagName)} must be a single character`);
				}

				if (aliases.has(alias)) {
					throw new Error(`Flag alias ${stringify(alias)} for ${stringify(flagName)} is already used`);
				}

				aliases.set(alias, {
					name: flagName,
					schema,
				});
			}
		}
	}

	return aliases;
}

const isArrayType = (flagType: FlagTypeOrSchema) => (
	flagType
	&& (
		Array.isArray(flagType)
		|| (
			('type' in flagType)
			&& Array.isArray(flagType.type)
		)
	)
);

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
		}
	}
};

export const getFlagType = (
	flagName: string,
	flagSchema: FlagTypeOrSchema,
): TypeFunction => {
	if (!flagSchema) {
		throw new Error(`Missing type on flag ${stringify(flagName)}`);
	}

	if (typeof flagSchema === 'function') {
		return flagSchema;
	}

	if (Array.isArray(flagSchema)) {
		return flagSchema[0];
	}

	return getFlagType(flagName, flagSchema.type);
};
