import {
	type TypeFunction,
	type FlagTypeOrSchema,
	type Flags,
	type FlagSchema,
	type ConsumedArgvItem,
	KNOWN_FLAG,
	UNKNOWN_FLAG,
} from './types.ts';
import { isStandardSchema, schemaToParser } from './standard-schema.ts';
import { createPositionalArgumentsFromParts } from './positional-arguments.ts';

/**
 * Regex uses zero-width assertions to find positions for hyphen insertion:
 * - (?<=[a-z0-9])(?=[A-Z])  →  after lowercase or digit, before uppercase
 * - (?<=[A-Z])(?=[A-Z][a-z])  →  after uppercase, before uppercase+lowercase
 */
const kebabPattern = /(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/g;
const hasUpperCasePattern = /[A-Z]/;

/**
 * Normalize a schema-declared flag name (e.g. `orgID`, `apiURL`, `fooBar`,
 * `oauth2Bearer`) to the kebab-case form that matches argv tokens
 * (`--org-id`, `--api-url`, `--foo-bar`, `--oauth2-bearer`).
 * Preserves acronyms as single segments.
 *
 * @example
 * ```ts
 * flagNameToKebab('orgID')         // => 'org-id'
 * flagNameToKebab('apiURL')        // => 'api-url'
 * flagNameToKebab('parseJSONData') // => 'parse-json-data'
 * flagNameToKebab('fooBar')        // => 'foo-bar'
 * flagNameToKebab('oauth2Bearer')  // => 'oauth2-bearer'
 * ```
 */
export const flagNameToKebab = (name: string): string => (
	// Perf: skip the costly look-around regex when there's no ASCII uppercase
	// to split on (the common case). `toLowerCase()` is still needed for
	// non-ASCII uppercase (e.g. `İ`) that `/[A-Z]/` doesn't detect.
	hasUpperCasePattern.test(name)
		? name.replaceAll(kebabPattern, '-').toLowerCase()
		: name.toLowerCase()
);

const { hasOwnProperty } = Object.prototype;
export const hasOwn = (
	object: unknown,
	property: PropertyKey,
) => hasOwnProperty.call(object, property);

export const parseFlagType = (
	flagSchema: FlagTypeOrSchema,
): [parser: TypeFunction, isArray: boolean] => {
	// Must run before the function check: callable schemas (e.g. ArkType) are
	// functions, but should validate via `~standard`, not be used as raw parsers.
	if (isStandardSchema(flagSchema)) {
		return [schemaToParser(flagSchema), false];
	}

	if (typeof flagSchema === 'function') {
		return [flagSchema, false];
	}

	if (Array.isArray(flagSchema)) {
		return [parseFlagType(flagSchema[0])[0], true];
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
	flagName?: string,
) => {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeFunction === Number && value === '') {
		return Number.NaN;
	}

	try {
		return typeFunction(value);
	} catch (error) {
		throw new TypeError(
			`Flag "--${flagName}": ${error instanceof Error ? error.message : error}`,
			{ cause: error },
		);
	}
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

export type FlagParsingData = [
	name: string,
	parser: TypeFunction,
	isArray: boolean,
	schema: FlagTypeOrSchema,
];

export type FlagRegistry = Map<string, FlagParsingData>;

const setFlag = (
	registry: FlagRegistry,
	flagName: string,
	data: FlagParsingData,
) => {
	if (registry.has(flagName)) {
		throw new Error(`Duplicate flags named "${flagName}"`);
	}

	registry.set(flagName, data);
};

export const createRegistry = (
	schemas: Flags,
) => {
	const registry: FlagRegistry = new Map();

	for (const flagName in schemas) {
		if (!hasOwn(schemas, flagName)) {
			continue;
		}
		validateFlagName(flagName);

		const schema = schemas[flagName];
		const flagData: FlagParsingData = [
			flagName,
			...parseFlagType(schema),
			schema,
		];

		setFlag(registry, flagName, flagData);

		const kebabCasing = flagNameToKebab(flagName);
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

/**
 * Bucket the ordered `consumed` stream by item kind: known-flag values grouped
 * by canonical name (order preserved), unknown flags grouped by raw name, and
 * positionals (tracking which appeared after `--`).
 */
const groupConsumed = (
	consumed: ConsumedArgvItem[],
) => {
	const knownFlagValues = new Map<string, unknown[]>();
	const unknownFlags: Record<string, (string | boolean)[]> = {};
	const positionals: string[] = [];
	const doubleDashArguments: string[] = [];

	for (const item of consumed) {
		if (item.type === KNOWN_FLAG) {
			let values = knownFlagValues.get(item.name);
			if (!values) {
				values = [];
				knownFlagValues.set(item.name, values);
			}
			values.push(item.value);
		} else if (item.type === UNKNOWN_FLAG) {
			if (!hasOwn(unknownFlags, item.name)) {
				unknownFlags[item.name] = [];
			}
			unknownFlags[item.name].push(item.value);
		} else {
			positionals.push(item.value);
			if (item.afterDoubleDash) {
				doubleDashArguments.push(item.value);
			}
		}
	}

	return {
		knownFlagValues,
		unknownFlags,
		positionals,
		doubleDashArguments,
	};
};

/**
 * Resolve a single flag's final value from its collected occurrences: fall back
 * to the schema default when absent, return the full array for array flags, or
 * the last occurrence for scalar flags (last-wins).
 */
const resolveFlagValue = (
	schema: FlagTypeOrSchema,
	isArray: boolean,
	values: unknown[] | undefined,
) => {
	if (
		(!values || values.length === 0)
		// A raw schema (e.g. Zod, ArkType) can have its own `.default`; only a
		// flag-schema object's `default` is a type-flag default.
		&& !isStandardSchema(schema)
		&& 'default' in schema
	) {
		const { default: defaultValue } = schema;
		return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
	}

	if (isArray) {
		return values ?? [];
	}

	return values && values.at(-1);
};

/**
 * Derive the public result (`flags`, `unknownFlags`, `_`) from the ordered
 * `consumed` stream — the parser's single source of truth.
 */
export const finalizeParsed = (
	schemas: Flags,
	registry: FlagRegistry,
	consumed: ConsumedArgvItem[],
) => {
	const {
		knownFlagValues,
		unknownFlags,
		positionals,
		doubleDashArguments,
	} = groupConsumed(consumed);

	const flags: Record<string, unknown> = {};
	for (const flagName in schemas) {
		if (!hasOwn(schemas, flagName)) {
			continue;
		}

		const flagData = registry.get(flagName);
		if (!flagData) {
			continue;
		}

		flags[flagName] = resolveFlagValue(
			flagData[3],
			flagData[2],
			knownFlagValues.get(flagName),
		);
	}

	return {
		flags,
		unknownFlags,
		_: createPositionalArgumentsFromParts(positionals, doubleDashArguments),
	};
};
