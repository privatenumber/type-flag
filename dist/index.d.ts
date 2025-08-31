declare const DOUBLE_DASH = "--";

type Simplify<T> = {
    [Key in keyof T]: T[Key];
} & {};
/**
 * A function that processes a command-line argument and returns a typed value.
 *
 * @example
 * ```ts
 * const toUpperCase = (value: string) => value.toUpperCase();
 * ```
 */
type TypeFunction<ReturnType = unknown> = (...args: any[]) => ReturnType;
/**
 * A shorthand for defining a flag's type.
 *
 * - Use a single `TypeFunction` to accept one value.
 * - Use a readonly tuple `[TypeFunction]` to accept multiple values (as an array).
 *
 * @see FlagSchema
 */
type FlagType = (TypeFunction | readonly [TypeFunction]);
/**
 * Defines the complete schema for a command-line flag.
 */
type FlagSchema = {
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
} & Record<PropertyKey, unknown>;
/**
 * A flag definition can either be a `FlagType` or a full `FlagSchema` object.
 */
type FlagTypeOrSchema = FlagType | FlagSchema;
/**
 * A map of flag names to their definitions.
 */
type Flags = {
    [flagName: string]: FlagTypeOrSchema;
};
type InferDefaultType<Flag extends FlagTypeOrSchema, Fallback> = Flag extends {
    default: infer DefaultType | (() => infer DefaultType);
} ? DefaultType : Fallback;
/**
 * Infers the final JavaScript type of a flag from its schema.
 */
type InferFlagType<Flag extends FlagTypeOrSchema> = (Flag extends readonly [TypeFunction<infer T>] | {
    type: readonly [TypeFunction<infer T>];
} ? (T[] | InferDefaultType<Flag, never>) : Flag extends TypeFunction<infer T> | {
    type: TypeFunction<infer T>;
} ? (T | InferDefaultType<Flag, undefined>) : never);
/**
 * The final parsed output from a `TypeFlag` run.
 */
type ParsedFlags<Schemas = never> = {
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
        /** Arguments that appeared after the `--` separator. */
        [DOUBLE_DASH]: string[];
    };
};
/**
 * The fully inferred return type from a given flag schema configuration.
 */
type TypeFlag<Schemas extends Flags> = ParsedFlags<{
    [flag in keyof Schemas]: InferFlagType<Schemas[flag]>;
}>;
/** Constant indicating a known flag token type. */
declare const KNOWN_FLAG = "known-flag";
/** Constant indicating an unknown flag token type. */
declare const UNKNOWN_FLAG = "unknown-flag";
/** Constant indicating a positional argument token type. */
declare const ARGUMENT = "argument";
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
    (type: typeof ARGUMENT, argvElement: string): boolean | void;
    /**
     * Ignore a known or unknown flag.
     *
     * @param type `'known-flag'` or `'unknown-flag'`
     * @param flagName The name of the flag.
     * @param flagValue The value provided, or `undefined` for boolean flags.
     */
    (type: typeof KNOWN_FLAG | typeof UNKNOWN_FLAG, flagName: string, flagValue: string | undefined): boolean | void;
};
/**
 * Options to customize the flag parsing behavior.
 */
type TypeFlagOptions = {
    /**
     * Optional function to skip certain argv elements from parsing.
     */
    ignore?: IgnoreFunction;
};

/**
type-flag: typed argv parser

@param schemas - A map of flag names to flag schemas
@param argv - Optional argv array of strings. [Default: process.argv.slice(2)]
@returns Parsed argv flags

@example
```ts
import { typeFlag } from 'type-flag';

const parsed = typeFlag({
    foo: Boolean,
    bar: {
        type: Number,
        default: 8
    }
})
```
*/
declare const typeFlag: <Schemas extends Flags>(schemas: Schemas, argv?: string[], { ignore }?: TypeFlagOptions) => Simplify<TypeFlag<Schemas>>;

declare const getFlag: <Type extends FlagType>(flagNames: string, flagType: Type, argv?: string[]) => InferFlagType<Type>;

export { type Flags, type TypeFlag, type TypeFlagOptions, getFlag, typeFlag };
