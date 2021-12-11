export type TypeFunction<T = any> = (value: any) => T;

export type TypeFunctionArray<T = any> = readonly [TypeFunction<T>];

type FlagSchemaBase<T> = {
	type: T;
	alias?: string;
};

type FlagSchmaRequired<T> = FlagSchemaBase<T> & {
	required: true;
};

type FlagSchmaDefault<T> = FlagSchemaBase<T> & {
	default: any;
	// Mutually exclusive with default
	required?: undefined;
};

export type FlagSchema<T = TypeFunction | TypeFunctionArray> = (
	FlagSchemaBase<T>
	| FlagSchmaRequired<T>
	| FlagSchmaDefault<T>
);

export type FlagTypeOrSchema = TypeFunction | TypeFunctionArray | FlagSchema;

export type Flags = {
	[flagName: string]: FlagTypeOrSchema;
};

export type InferFlagType<
	Flag extends FlagTypeOrSchema
> = Flag extends (TypeFunction<infer T> | FlagSchema<TypeFunction<infer T>>)
	// Type function return-type
	? (
		Flag extends (FlagSchmaRequired<TypeFunction<T>> | FlagSchmaDefault<TypeFunction<T>>)
			? T
			: T | undefined
	)

	// Type function return-type in array
	: (
		Flag extends (TypeFunctionArray<infer T> | FlagSchema<TypeFunctionArray<infer T>>)
			? T[]
			: never
	);

export type TypeFlag<Schemas extends Flags> = {
	flags: {
		[flag in keyof Schemas]: InferFlagType<Schemas[flag]>;
	};
	unknownFlags: {
		[flag: string]: (string | boolean)[];
	};
	_: string[];
};
