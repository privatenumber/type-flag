import type { StandardSchemaV1 } from './standard-schema.ts';

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
 * The value used to type a flag: a parser function or a Standard Schema.
 */
type FlagTypeValue = TypeFunction | StandardSchemaV1;

/**
 * A shorthand for defining a flag's type.
 *
 * - Use a single `TypeFunction` or Standard Schema to accept one value.
 * - Use a readonly tuple (e.g. `[TypeFunction]`) to accept multiple values (as an array).
 *
 * @see FlagSchema
 */
export type FlagType = (
	FlagTypeValue
	| readonly [FlagTypeValue]
);

/**
 * Workaround for TypeScript bug where `Readonly<T>` in parameter position breaks
 * conditional type matching in return type. Adding `& AnyObject` to extends clauses
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

/**
 * Positional arguments with post-`--` values exposed separately.
 */
export type PositionalArguments = string[] & {

	/** Arguments that appeared after the `--` separator. */
	'--': string[];
};

// Infers the type from the default value of a flag schema.
// Note: Preserves literal types from default functions (e.g., () => 'hello' infers 'hello').
// Users can widen types explicitly with type assertions (e.g., 'hello' as string).
type InferDefaultType<
	Flag extends FlagTypeOrSchema,
	Fallback,
> = Flag extends { default: infer DefaultType | (() => infer DefaultType) } & AnyObject
	? DefaultType
	: Fallback;

/**
 * Resolves the output type of a single flag-type element: a parser function's
 * return type, or a Standard Schema's output type.
 */
type InferType<Element> = (
	Element extends StandardSchemaV1
		? StandardSchemaV1.InferOutput<Element>
		: Element extends TypeFunction<infer Return>
			? Return
			: never
);

// Unwrap a `{ type: ... }` flag-schema object to its underlying flag type.
// `& AnyObject` works around a TS bug where `Readonly<T>` in parameter position
// breaks conditional matching (see AnyObject above).
type FlagTypeOf<Flag> = (
	Flag extends { type: infer Type extends FlagType } & AnyObject ? Type : Flag
);

/**
 * Infers the final JavaScript type of a flag from its schema.
 *
 * `FlagTypeOf` unwraps the `{ type }` object form first, so only the two
 * underlying shapes (array vs scalar) need matching. `InferType` then resolves
 * each element whether it is a function or a schema.
 */
export type InferFlagType<
	Flag extends FlagTypeOrSchema,
> = (
	FlagTypeOf<Flag> extends readonly [infer Element extends FlagTypeValue]
		? InferArrayType<Flag, Element>
		: FlagTypeOf<Flag> extends infer Element extends FlagTypeValue
			? InferScalarType<Flag, Element>
			// Falls through for an untyped `Flags` index signature (a union that
			// matches neither shape), where the flag type is `unknown`.
			: unknown
);

// `InferType<Element> extends infer Output` forces the output type to resolve
// before it is unioned with the default, so e.g. `string[] | string[]` collapses
// to `string[]` instead of lingering as an un-reduced union.
type InferArrayType<
	Flag extends FlagTypeOrSchema,
	Element,
> = (
	InferType<Element> extends infer Output
		? (Output[] | InferDefaultType<Flag, never>)
		: never
);

// The `[Output] extends [never]` tuple trick prevents distributive conditional
// types, preserving `never` instead of widening it to `undefined`.
type InferScalarType<
	Flag extends FlagTypeOrSchema,
	Element,
> = (
	InferType<Element> extends infer Output
		? (
			[Output] extends [never]
				? Output
				: (Output | InferDefaultType<Flag, undefined>)
		)
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
	_: PositionalArguments;
};

/** Constant indicating a known flag token type. */
export const KNOWN_FLAG = 'known-flag';

/** Constant indicating an unknown flag token type. */
export const UNKNOWN_FLAG = 'unknown-flag';

/** Constant indicating a positional argument token type. */
export const ARGUMENT = 'argument';

/**
 * A function to dynamically ignore specific elements during parsing.
 * Return `true` to skip the element, or `false`/`undefined` to process it normally.
 *
 * @param type - The type of element being processed:
 *   - `'argument'`: A positional argument (non-flag value)
 *   - `'known-flag'`: A flag defined in the schema
 *   - `'unknown-flag'`: A flag not defined in the schema
 * @param argvElement - The raw argv string. For arguments, this is the value itself.
 *   For flags, this is the flag name (e.g., `'--verbose'` or `'-v'`).
 * @param flagValue - The value associated with a flag, if any.
 *   - For flags with explicit values: the string value (e.g., `'--port=3000'` → `'3000'`)
 *   - For boolean flags or flags without values: `undefined`
 *   - For arguments (`type === 'argument'`): always `undefined`
 * @returns `true` to ignore/skip this element, `false` or `undefined` to process it
 *
 * @example
 * ```ts
 * // Ignore all unknown flags
 * ignore: (type) => type === 'unknown-flag'
 * ```
 *
 * @example
 * ```ts
 * // Ignore arguments starting with a dot
 * ignore: (type, argvElement) => type === 'argument' && argvElement.startsWith('.')
 * ```
 *
 * @example
 * ```ts
 * // Ignore a specific flag
 * ignore: (type, argvElement) => argvElement === '--internal-only'
 * ```
 */
export type IgnoreFunction = (
	type: typeof ARGUMENT | typeof KNOWN_FLAG | typeof UNKNOWN_FLAG,
	argvElement: string,
	flagValue?: string,
) => boolean | void;

/**
 * Options to customize the flag parsing behavior.
 */
export type TypeFlagOptions = {

	/**
	 * Optional function to skip certain argv elements from parsing.
	 */
	ignore?: IgnoreFunction;

	/**
	 * Enable `--no-<flag>` negation for boolean flags.
	 *
	 * When enabled, `--no-verbose` is equivalent to `--verbose=false`.
	 * Only applies to flags defined as `Boolean` in the schema.
	 * Last-wins semantics apply between `--flag` and `--no-flag`.
	 */
	booleanNegation?: boolean;
};
