import type {
	TypeFunction,
	FlagTypeOrSchema,
	FlagSchema,
	Flags,
} from './types';

const camelToKebab = (string_: string) => {
	let out = '';
	for (let i = 0; i < string_.length; i += 1) {
		const code = string_.codePointAt(i);
		// If uppercase A–Z:
		if (code && code >= 65 && code <= 90) {
			if (i) { out += '-'; }
			// convert to lowercase by adding 32
			out += String.fromCodePoint(code + 32);
		} else {
			out += string_[i];
		}
	}
	return out;
};

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

const isSpaceChar = (ch: string) => {
	const c = ch.codePointAt(0);
	return (
		c && (
			c === 32 // space
			|| (c >= 9 && c <= 13) // \t, \n, \v, \f, \r
			|| c === 0xA0 // non‑breaking space
		)
	);
};

const validateFlagName = (
	flagName: string,
) => {
	const errorPrefix = `Flag name "${flagName}"`;

	if (flagName.length === 0) {
		throw new Error(`${errorPrefix} cannot be empty`);
	}

	for (const ch of flagName) {
		// Reserved characters
		if (ch === '.' || ch === ':' || ch === '=' || isSpaceChar(ch)) {
			throw new Error(`${errorPrefix} cannot contain "${ch}"`);
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

const setFlag = (
	registry: FlagRegistry,
	flagName: string,
	data: FlagParsingData,
) => {
	if (flagName in registry) {
		throw new Error(`Duplicate flags named "${flagName}"`);
	}

	registry[flagName] = data;
};

export const createRegistry = (
	schemas: Flags,
) => {
	const registry = { __proto__: null } as unknown as FlagRegistry;

	// eslint-disable-next-line guard-for-in
	for (const flagName in schemas) {
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
	for (const flagName of Object.keys(schemas)) {
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
