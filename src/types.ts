import type { DOUBLE_DASH } from './argv-iterator';

// Expand the type of a given object to include all its properties.
export type Simplify<T> = { [Key in keyof T]: T[Key] } & {};

/**
 * A function that processes a command-line argument and returns a typed value.
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
 * - Use a readonly tuple `[TypeFunction]` to accept multiple values (as an array).
 *
 * @see FlagSchema
 */
export type FlagType = (
	TypeFunction
	| readonly [TypeFunction]
);

/**
 * Workaround for TypeScript bug where `Readonly<T>` in parameter position breaks
 * conditional type matching in return type. Adding `& Object_` to extends clauses
 * fixes the matcher.
 *
 * @see https://github.com/microsoft/TypeScript/issues/62720
 */
type AnyObject = Record<PropertyKey, unknown>;

/**
 * Defines the complete schema for a command-line flag.
 */
export type FlagSchema = {

	/**
	 * The function or tuple of functions that parse the `argv` string into a typed value.
	 *
	 * @example
	 * ```ts
	 * type: String
	 * ```
	 * @example
	 * ```ts
	 * type: [Boolean]
	 * ```
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
	 * @example
	 * ```ts
	 * default: () => [1, 2, 3]
	 * ```
	 */
	default?: unknown | (() => unknown);
} & AnyObject;

/**
 * A flag definition can either be a `FlagType` or a full `FlagSchema` object.
 */
export type FlagTypeOrSchema<
	ExtraOptions = Record<string, unknown>,
> = FlagType | (FlagSchema & ExtraOptions);

/**
 * A map of flag names to their definitions.
 */
export type Flags<ExtraOptions = Record<string, unknown>> = {
	[flagName: string]: FlagTypeOrSchema<ExtraOptions>;
};

// Infers the type from the default value of a flag schema.
// Note: Preserves literal types from default functions (e.g., () => 'hello' infers 'hello').
// Users can widen types explicitly with type assertions (e.g., 'hello' as string).
type InferDefaultType<
	Flag extends FlagTypeOrSchema,
	Fallback,
> = Flag extends { default: infer DefaultType | (() => infer DefaultType) } & AnyObject // Workaround
	? DefaultType
	: Fallback;

/**
 * Infers the final JavaScript type of a flag from its schema.
 */
export type InferFlagType<
	Flag extends FlagTypeOrSchema,
> = (
	Flag extends readonly [TypeFunction<infer T>] | { type: readonly [TypeFunction<infer T>] }
		? (T[] | InferDefaultType<Flag, never>)
		: Flag extends TypeFunction<infer T> | ({ type: TypeFunction<infer T> } & AnyObject) // Workaround
			// Tuple trick: [T] extends [never] prevents distributive conditional types,
			// preserving never instead of widening to undefined
			? ([T] extends [never] ? T : (T | InferDefaultType<Flag, undefined>))
			: never
);

/**
 * The fully inferred return type from a given flag schema configuration.
 */
export type TypeFlag<Schemas extends Flags = Flags> = {

	/** Parsed values keyed by flag name. */
	flags: {
		[flag in keyof Schemas]: InferFlagType<Schemas[flag]>;
	};

	/** Flags that were passed but not defined in the schema. */
	unknownFlags: {
		[flagName: string]: (string | boolean)[];
	};

	/**
	 * Positional arguments (non-flag values).
	 * Includes a special `"--"` key for arguments after the double dash.
	 */
	_: string[] & {

		/** Arguments that appeared after the `--` separator. */
		[DOUBLE_DASH]: string[];
	};
};

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
export type IgnoreFunction = {

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
		flagValue?: string | undefined,
	): boolean | void;
};

/**
 * Options to customize the flag parsing behavior.
 */
export type TypeFlagOptions = {

	/**
	 * Optional function to skip certain argv elements from parsing.
	 */
	ignore?: IgnoreFunction;
};
