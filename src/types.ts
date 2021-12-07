export type TypeFunction<T = any> = (value: any) => T;

export type TypeFunctionArray<T = any> = [TypeFunction<T>];

type FlagSchemaBase<T> = {
	type: TypeFunction<T> | TypeFunctionArray<T>;
	alias?: string;
};

export type FlagSchema<T = any> = (
	FlagSchemaBase<T>
	| (FlagSchemaBase<T> & { required: true })
	| (FlagSchemaBase<T> & {
		default: T | (() => T);
		// Mutually exclusive with default
		required?: undefined;
	})
);

export type FlagTypeOrSchema = TypeFunction | TypeFunctionArray | FlagSchema;

export type Flags = {
	[flagName: string]: FlagTypeOrSchema;
};

export type ParsedFlags = {
	[flag: string]: (string | boolean)[];
};

export type InferFlagType<
	Flag extends FlagTypeOrSchema
> = Flag extends (TypeFunction<infer T> | { type: TypeFunction<infer T> })
	// Type function return-type
	? (
		Flag extends { required?: true; default?: any }
			? T
			: T | undefined
	)

	// Type function return-type in array
	: (
		Flag extends (TypeFunctionArray<infer T> | { type: TypeFunctionArray<infer T> })
			? T[]
			: never
	);
