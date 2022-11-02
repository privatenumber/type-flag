import type { DOUBLE_DASH } from './argv-iterator';

export type TypeFunction<ReturnType = any> = (value: any) => ReturnType;

type TypeFunctionArray<ReturnType> = readonly [TypeFunction<ReturnType>];

export type FlagType<ReturnType = any> = TypeFunction<ReturnType> | TypeFunctionArray<ReturnType>;

type FlagSchemaBase<TF> = {
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

type FlagSchemaDefault<TF, DefaultType = any> = FlagSchemaBase<TF> & {
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

export type FlagSchema<TF = FlagType> = (
	FlagSchemaBase<TF>
	| FlagSchemaDefault<TF>
);

export type FlagTypeOrSchema<
	ExtraOptions = Record<string, unknown>
> = FlagType | (FlagSchema & ExtraOptions);

export type Flags<ExtraOptions = Record<string, unknown>> = {
	[flagName: string]: FlagTypeOrSchema<ExtraOptions>;
};

export type InferFlagType<
	Flag extends FlagTypeOrSchema
> = (
	Flag extends (TypeFunctionArray<infer T> | FlagSchema<TypeFunctionArray<infer T>>)
		? (
			Flag extends FlagSchemaDefault<TypeFunctionArray<T>, infer D>
				? T[] | D
				: T[]
		)
		: (
			Flag extends TypeFunction<infer T> | FlagSchema<TypeFunction<infer T>>
				? (
					Flag extends FlagSchemaDefault<TypeFunction<T>, infer D>
						? T | D
						: T | undefined
				)
				: never
		)
);

export type ParsedFlags<Schemas = Record<string, unknown>> = {
	flags: Schemas;
	unknownFlags: {
		[flagName: string]: (string | boolean)[];
	};
	_: string[] & {
		[DOUBLE_DASH]: string[];
	};
};

export type TypeFlag<Schemas extends Flags> = ParsedFlags<{
	[flag in keyof Schemas]: InferFlagType<Schemas[flag]>;
}>;

export enum ArgvType {
	KnownFlag = 'known-flag',
	UnknownFlag = 'unknown-flag',
	Argument = 'argument',
}

type IgnoreFunction = {
	(
		type: ArgvType.Argument,
		argvElement: string,
	): boolean | void;

	(
		type: ArgvType.KnownFlag | ArgvType.UnknownFlag,
		flagName: string,
		flagValue: string | undefined,
	): boolean | void;
};

export type TypeFlagOptions = {
	ignore?: IgnoreFunction;
};
