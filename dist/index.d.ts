declare const DOUBLE_DASH = "--";

declare type TypeFunction<ReturnType = any> = (value: any) => ReturnType;
declare type TypeFunctionArray<ReturnType> = readonly [TypeFunction<ReturnType>];
declare type FlagType<ReturnType = any> = TypeFunction<ReturnType> | TypeFunctionArray<ReturnType>;
declare type FlagSchemaBase<TF> = {
    /**
    Type of the flag as a function that parses the argv string and returns the parsed value.

    @example
    ```
    type: String
    ```

    @example Wrap in an array to accept multiple values.
    ```
    type: [Boolean]
    ```

    @example Custom function type that uses moment.js to parse string as date.
    ```
    type: function CustomDate(value: string) {
        return moment(value).toDate();
    }
    ```
    */
    type: TF;
    /**
    A single-character alias for the flag.

    @example
    ```
    alias: 's'
    ```
    */
    alias?: string;
} & Record<PropertyKey, unknown>;
declare type FlagSchemaDefault<TF, DefaultType = any> = FlagSchemaBase<TF> & {
    /**
    Default value of the flag. Also accepts a function that returns the default value.
    [Default: undefined]

    @example
    ```
    default: 'hello'
    ```

    @example
    ```
    default: () => [1, 2, 3]
    ```
    */
    default: DefaultType | (() => DefaultType);
};
declare type FlagSchema<TF = FlagType> = (FlagSchemaBase<TF> | FlagSchemaDefault<TF>);
declare type FlagTypeOrSchema<ExtraOptions = Record<string, unknown>> = FlagType | (FlagSchema & ExtraOptions);
declare type Flags<ExtraOptions = Record<string, unknown>> = {
    [flagName: string]: FlagTypeOrSchema<ExtraOptions>;
};
declare type InferFlagType<Flag extends FlagTypeOrSchema> = (Flag extends (TypeFunctionArray<infer T> | FlagSchema<TypeFunctionArray<infer T>>) ? (Flag extends FlagSchemaDefault<TypeFunctionArray<T>, infer D> ? T[] | D : T[]) : (Flag extends TypeFunction<infer T> | FlagSchema<TypeFunction<infer T>> ? (Flag extends FlagSchemaDefault<TypeFunction<T>, infer D> ? T | D : T | undefined) : never));
declare type ParsedFlags<Schemas = Record<string, unknown>> = {
    flags: Schemas;
    unknownFlags: {
        [flagName: string]: (string | boolean)[];
    };
    _: string[] & {
        [DOUBLE_DASH]: string[];
    };
};
declare type TypeFlag<Schemas extends Flags> = ParsedFlags<{
    [flag in keyof Schemas]: InferFlagType<Schemas[flag]>;
}>;
declare const KNOWN_FLAG = "known-flag";
declare const UNKNOWN_FLAG = "unknown-flag";
declare const ARGUMENT = "argument";
declare type IgnoreFunction = {
    (type: typeof ARGUMENT, argvElement: string): boolean | void;
    (type: typeof KNOWN_FLAG | typeof UNKNOWN_FLAG, flagName: string, flagValue: string | undefined): boolean | void;
};
declare type TypeFlagOptions = {
    ignore?: IgnoreFunction;
};

/**
type-flag: typed argv parser

@param schemas - A map of flag names to flag schemas
@param argv - Optional argv array of strings. [Default: process.argv.slice(2)]
@returns Parsed argv flags

@example
```ts
import typeFlag from 'type-flag';

const parsed = typeFlag({
    foo: Boolean,
    bar: {
        type: Number,
        default: 8
    }
})
```
*/
declare const typeFlag: <Schemas extends Flags<Record<string, unknown>>>(schemas: Schemas, argv?: string[], { ignore }?: TypeFlagOptions) => {
    flags: { [flag in keyof Schemas]: InferFlagType<Schemas[flag]>; };
    unknownFlags: {
        [flagName: string]: (string | boolean)[];
    };
    _: string[] & {
        "--": string[];
    };
};

declare const getFlag: <Type extends FlagType<any>>(flagNames: string, flagType: Type, argv?: string[]) => InferFlagType<Type>;

export { Flags, TypeFlag, TypeFlagOptions, getFlag, typeFlag };
