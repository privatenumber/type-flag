declare type TypeFunction<ReturnType = any> = (value: any) => ReturnType;
declare type TypeFunctionArray<ReturnType = any> = readonly [TypeFunction<ReturnType>];
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
declare type FlagSchema<TF = TypeFunction | TypeFunctionArray> = (FlagSchemaBase<TF> | FlagSchemaDefault<TF>);
declare type FlagTypeOrSchema<ExtraOptions = Record<string, unknown>> = TypeFunction | TypeFunctionArray | (FlagSchema & ExtraOptions);
declare type Flags<ExtraOptions = Record<string, unknown>> = {
    [flagName: string]: FlagTypeOrSchema<ExtraOptions>;
};
declare type InferFlagType<Flag extends FlagTypeOrSchema> = (Flag extends (TypeFunctionArray<infer T> | FlagSchema<TypeFunctionArray<infer T>>) ? (Flag extends FlagSchemaDefault<TypeFunctionArray<T>, infer D> ? T[] | D : T[]) : (Flag extends TypeFunction<infer T> | FlagSchema<TypeFunction<infer T>> ? (Flag extends FlagSchemaDefault<TypeFunction<T>, infer D> ? T | D : T | undefined) : never));
declare type TypeFlag<Schemas extends Flags> = {
    flags: {
        [flag in keyof Schemas]: InferFlagType<Schemas[flag]>;
    };
    unknownFlags: {
        [flag: string]: (string | boolean)[];
    };
    _: string[] & {
        '--': string[];
    };
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
declare function typeFlag<Schemas extends Flags>(schemas: Schemas, argv?: string[], options?: {
    ignoreUnknown?: boolean;
}): {
    flags: { [flag in keyof Schemas]: InferFlagType<Schemas[flag]>; };
    unknownFlags: {
        [flag: string]: (string | boolean)[];
    };
    _: string[] & {
        '--': string[];
    };
};

export { Flags, TypeFlag, typeFlag as default };
