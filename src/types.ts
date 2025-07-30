import type { DOUBLE_DASH } from './argv-iterator';

/**
 * Represents a function that processes a command-line argument and returns a typed value.
 *
 * @template ReturnType The type of the value returned by the function.
 * @param value The raw string value from `argv`.
 *
 * @example
 * ```ts
 * const toUpperCase = (value: string) => value.toUpperCase();
 * ```
 */
export type TypeFunction<ReturnType = unknown> = (...args: any[]) => ReturnType;

/**
 * A shorthand for defining a flag's type.
 *
 * - Use a single `TypeFunction` to accept one value.
 * - Use a readonly tuple `[TypeFunction]` to accept multiple values (array form).
 *
 * @template ReturnType The type of the parsed value.
 * @see FlagSchema
 */
export type FlagType = (
	TypeFunction
	| readonly [TypeFunction]
);

/**
 * Defines the complete schema for a command-line flag.
 *
 * @template T The `FlagType` for this flag.
 * @template DefaultValue The type of the default value.
 */
export type FlagSchema = {

	/**
	 * The function or tuple of functions that parse the `argv` string into a typed value.
	 *
	 * @example
	 * ```ts
	 * type: String
	 * ```
	 *
	 * @example
	 * ```ts
	 * type: [Boolean]
	 * ```
	 *
	 * @example
	 * ```ts
	 * type: (value: string) => moment(value).toDate()
	 * ```
	 */
	type: FlagType;

	/**
	 * A single-character alias for the flag.
	 *
	 * @example
	 * ```ts
	 * alias: 's'
	 * ```
	 */
	alias?: string;

	/**
	 * The default value for the flag if not provided.
	 * Can also be a function that returns the default.
	 *
	 * @example
	 * ```ts
	 * default: 'hello'
	 * ```
	 *
	 * @example
	 * ```ts
	 * default: () => [1, 2, 3]
	 * ```
	 */
	default?: unknown | (() => unknown);
} & Record<PropertyKey, unknown>;

/**
 * Represents the definition for a single flag. It can be:
 * - A simple `FlagType`, or
 * - A full `FlagSchema` object (optionally extended with extra properties).
 *
 * @template ExtraOptions Extra properties allowed in the schema object.
 */
export type FlagTypeOrSchema<
	ExtraOptions = Record<string, unknown>,
> = FlagType | (FlagSchema & ExtraOptions);

/**
 * A map of flag names to their definitions.
 *
 * @template ExtraOptions Extra properties allowed in each schema.
 */
export type Flags = {
	[flagName: string]: FlagTypeOrSchema;
};

// Infers the type from the default value of a flag schema.
type InferDefaultType<
	Flag extends FlagTypeOrSchema,
	Fallback,
> = Flag extends { default: infer DefaultType | (() => infer DefaultType) }
	? DefaultType
	: Fallback;

/**
 * Infers the final JavaScript type of a flag from its schema.
 *
 * @template Flag The flag schema to infer the type from.
 */
export type InferFlagType<
	Flag extends FlagTypeOrSchema,
> = (
	Flag extends readonly [TypeFunction<infer T>] | { type: readonly [TypeFunction<infer T>] }
		? (T[] | InferDefaultType<Flag, never>)
		: Flag extends TypeFunction<infer T> | { type: TypeFunction<infer T> }
			? (T | InferDefaultType<Flag, undefined>)
			: never
);

/**
 * The final parsed output object.
 *
 * @template Schemas The inferred types of all parsed flags.
 */
export type ParsedFlags<Schemas = Record<string, unknown>> = {

	/** Parsed values keyed by flag name. */
	flags: Schemas;

	/** Flags that were passed but not defined in the schema. */
	unknownFlags: {
		[flagName: string]: (string | boolean)[];
	};

	/**
	 * Positional arguments (non-flag values).
	 * Includes a special `"--"` key for arguments after the double dash.
	 */
	_: string[] & {

		/** Arguments after the `--` double dash separator. */
		[DOUBLE_DASH]: string[];
	};
};

/**
 * The fully inferred return type from a given flag schema configuration.
 *
 * @template Schemas A map of flag names to their definitions.
 */
export type TypeFlag<Schemas extends Flags> = ParsedFlags<{
	[flag in keyof Schemas]: InferFlagType<Schemas[flag]>;
}>;

/** Constant indicating a known flag token type. */
export const KNOWN_FLAG = 'known-flag';

/** Constant indicating an unknown flag token type. */
export const UNKNOWN_FLAG = 'unknown-flag';

/** Constant indicating a positional argument token type. */
export const ARGUMENT = 'argument';

/**
 * A function to dynamically ignore specific elements during parsing.
 * Returning `true` skips that element.
 */
type IgnoreFunction = {

	/**
	 * Ignore a positional argument (e.g., a filename).
	 *
	 * @param type Always `'argument'`
	 * @param argvElement The raw argument string.
	 */
	(
		type: typeof ARGUMENT,
		argvElement: string
	): boolean | void;

	/**
	 * Ignore a known or unknown flag.
	 *
	 * @param type `'known-flag'` or `'unknown-flag'`
	 * @param flagName The name of the flag.
	 * @param flagValue The value provided, or `undefined` for boolean flags.
	 */
	(
		type: typeof KNOWN_FLAG | typeof UNKNOWN_FLAG,
		flagName: string,
		flagValue: string | undefined,
	): boolean | void;
};

/**
 * Options to customize the flag parsing behavior.
 */
export type TypeFlagOptions = {

	/**
	 * Optional function to skip certain argv elements from parsing.
	 *
	 * @see IgnoreFunction
	 */
	ignore?: IgnoreFunction;
};
