import type {
	TypeFunction,
	FlagTypeOrSchema,
	Flags,
} from './types';

const { stringify } = JSON;
const camelCasePattern = /\B([A-Z])/g;
const camelToKebab = (string: string) => string.replace(camelCasePattern, '-$1').toLowerCase();

const { hasOwnProperty } = Object.prototype;
export const hasOwn = (object: any, property: PropertyKey) => hasOwnProperty.call(object, property);

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
	value: any,
) => {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeFunction === Number && value === '') {
		return Number.NaN;
	}

	return typeFunction(value);
};

type FlagParsingData = [
	parser: TypeFunction,
	values: unknown[],
];

type FlagRegistry = {
	[flagName: string]: FlagParsingData;
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

export const createRegistry = (
	schemas: Flags,
) => {
	const registry: FlagRegistry = {};
	const flags: Record<string, unknown> = {};

	const setFlag = (name: string, value: any) => {
		if (hasOwn(registry, name)) {
			throw new Error(`Duplicate flags named ${stringify(name)}`);
		}

		registry[name] = value;
	};

	for (const flagName in schemas) {
		if (!hasOwn(schemas, flagName)) {
			continue;
		}
		validateFlagName(flagName);

		const schema = schemas[flagName];
		const [parser, isArray] = parseFlagType(schema);
		const values: unknown[] = [];
		const asdf = [parser, values];

		Object.defineProperty(flags, flagName, {
			enumerable: true,
			get() {
				if (
					values.length === 0
					&& 'default' in schema
				) {
					let { default: defaultValue } = schema;
					if (typeof defaultValue === 'function') {
						defaultValue = defaultValue();
					}
					return defaultValue;
				}

				return isArray ? values : values.pop();
			},
		});

		setFlag(flagName, asdf);

		const kebabCasing = camelToKebab(flagName);
		if (flagName !== kebabCasing) {
			setFlag(kebabCasing, asdf);
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

			setFlag(alias, asdf);
		}
	}

	return [registry, flags] as const;
};
