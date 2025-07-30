import type { DOUBLE_DASH } from './argv-iterator';

/**
 * Represents a function that processes a command-line argument and returns a typed value.
 *
 * @template ReturnType The type of the value returned by the function.
 * @param value The raw string value from `argv`.
 * @returns The parsed and typed value.
 * @example
 * ```
 * const toUpperCase = (value: string) => value.toUpperCase();
 * ```
 */
export type TypeFunction<ReturnType = unknown> = (...args: any[]) => ReturnType;

/**
 * A shorthand for defining a flag's type. It can be a single `TypeFunction`
 * for a single value, or a `readonly` tuple containing a `TypeFunction` for multiple values.
 *
 * @template ReturnType The type of the parsed value.
 * @see FlagSchema
 */
export type FlagType<ReturnType = unknown> = (
	TypeFunction<ReturnType>
	| readonly [TypeFunction<ReturnType>]
);

/**
 * Defines the complete schema for a command-line flag.
 *
 * @template T The `FlagType` for this flag.
 * @template DefaultValue The type of the default value.
 */
export type FlagSchema<
	T extends FlagType = FlagType,
	DefaultValue = unknown,
> = {

	/**
	 * The function that parses the `argv` string into its expected type.
	 *
	 * @example For a single string value
	 * ```
	 * type: String
	 * ```
	 *
	 * @example To accept multiple boolean values
	 * ```
	 * type: [Boolean]
	 * ```
	 *
	 * @example For a custom date parser
	 * ```
	 * type: (value: string) => moment(value).toDate()
	 * ```
	 */
	type: T;

	/**
	 * A single-character alias for the flag.
	 *
	 * @example
	 * ```
	 * alias: 's'
	 * ```
	 */
	alias?: string;

	/**
	 * The default value for the flag if it is not provided.
	 * This can also be a function that returns the default value.
	 *
	 * @example
	 * ```
	 * default: 'hello'
	 * ```
	 *
	 * @example Using a function for a mutable default
	 * ```
	 * default: () => [1, 2, 3]
	 * ```
	 */
	default?: DefaultValue | (() => DefaultValue);
} & Record<PropertyKey, unknown>; // Allows for custom, untyped properties

/**
 * Represents the definition for a single flag, which can either be a
 * shorthand `FlagType` or a full `FlagSchema` object.
 *
 * @template ExtraOptions An object type allowing for custom properties to be added to the schema.
 */
export type FlagTypeOrSchema<
	ExtraOptions = Record<string, unknown>,
> = FlagType | (FlagSchema & ExtraOptions);

/**
 * A map of flag names to their corresponding definitions. This is the primary
 * configuration object for defining all expected command-line flags.
 *
 * @template ExtraOptions An object type allowing for custom properties to be
 * added to all flag schemas.
 */
export type Flags<ExtraOptions = Record<string, unknown>> = {
	[flagName: string]: FlagTypeOrSchema<ExtraOptions>;
};

// Infers the type for a flag that accepts multiple values
type InferMultiValueFlag<
	Flag extends FlagTypeOrSchema,
	T,
> = Flag extends { default: infer DefaultType | (() => infer DefaultType) }
	? T[] | DefaultType
	: T[];

// Infers the type for a flag that accepts a single value
type InferSingleValueFlag<
	Flag extends FlagTypeOrSchema,
	T,
> = Flag extends { default: infer DefaultType | (() => infer DefaultType) }
	? T | DefaultType
	: T | undefined;

/**
 * Infers the final JavaScript type of a flag based on its schema definition.
 * - Handles single and multiple values.
 * - Considers the presence of a default value.
 *
 * @template Flag The `FlagTypeOrSchema` to infer the type from.
 */
export type InferFlagType<
	Flag extends FlagTypeOrSchema,
> = (
	// Check if the flag is a multi-value (array) type
	Flag extends readonly [TypeFunction<infer T>] | { type: readonly [TypeFunction<infer T>] }
		? InferMultiValueFlag<Flag, T>
		// Check if the flag is a single-value type
		: Flag extends TypeFunction<infer T> | { type: TypeFunction<infer T> }
			? InferSingleValueFlag<Flag, T>
			: never
);

/**
 * The final parsed output object.
 *
 * @template Schemas The inferred types of all parsed flags.
 */
export type ParsedFlags<Schemas = Record<string, unknown>> = {

	/** A map of flag names to their parsed values. */
	flags: Schemas;

	/** A map of any flags that were not defined in the schema. */
	unknownFlags: {
		[flagName: string]: (string | boolean)[];
	};

	/**
	 * An array of positional arguments.
	 *
	 * @property [DOUBLE_DASH] - An array of arguments that appeared after the `--` separator.
	 */
	_: string[] & {
		[DOUBLE_DASH]: string[];
	};
};

/**
 * The main return type, providing a fully typed object based on the input schemas.
 *
 * @template Schemas The `Flags` configuration object.
 */
export type TypeFlag<Schemas extends Flags> = ParsedFlags<{
	[flag in keyof Schemas]: InferFlagType<Schemas[flag]>;
}>;

export const KNOWN_FLAG = 'known-flag';
export const UNKNOWN_FLAG = 'unknown-flag';
export const ARGUMENT = 'argument';

/**
 * A function to dynamically ignore specific argv elements during parsing.
 * Returning `true` from this function will prevent the given element from being processed.
 */
type IgnoreFunction = {

	/**
	 * @param type The type of token: `'argument'`.
	 * @param argvElement The raw argument string from argv (e.g., `'my-file.txt'`).
	 */
	(
		type: typeof ARGUMENT,
		argvElement: string,
	): boolean | void;

	/**
	 * @param type The type of token: `'known-flag'` or `'unknown-flag'`.
	 * @param flagName The name of the flag (e.g., `'verbose'`).
	 * @param flagValue The value of the flag, or `undefined` for boolean flags.
	 */
	(
		type: typeof KNOWN_FLAG | typeof UNKNOWN_FLAG,
		flagName: string,
		flagValue: string | undefined,
	): boolean | void;
};

/**
 * Options for customizing the parsing behavior.
 */
export type TypeFlagOptions = {

	/**
	 * A function that determines which argv elements to ignore during parsing.
	 * @see IgnoreFunction
	 */
	ignore?: IgnoreFunction;
};
