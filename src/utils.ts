import assert from 'assert';
import type {
	TypeFunction,
	FlagSchema,
	Flags,
	ParsedFlags,
	InferFlagType,
} from './types';

const camelizePattern = /-(\w)/g;
export const camelize = (string: string) => string.replace(
	camelizePattern,
	(_, c) => (c ? c.toUpperCase() : ''),
);

const { stringify } = JSON;

const { hasOwnProperty } = Object.prototype;
const hasOwn = (object: any, property: string | symbol) => hasOwnProperty.call(object, property);

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

		assert(name.length > 0, `Invalid flag name ${stringify(name)}: flag name cannot be empty}`);
		assert(name.length !== 1, `Invalid flag name ${stringify(name)}: single characters are reserved for aliases`);

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

const flagPrefixPattern = /^--?/;
const valueDelimiterPattern = /[:=]/;

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
