export type TypeFunction<T = any> = (argvValue: any) => T;

export type TypeFunctionArray<T = any> = [TypeFunction<T>];

export type FlagSchema = {
	type: TypeFunction | TypeFunctionArray;
	alias?: string;
	required?: true;
};

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
		Flag extends { required: true }
			? T
			: T | undefined
	)

	// Type function return-type in array
	: (
		Flag extends (TypeFunctionArray<infer T> | { type: TypeFunctionArray<infer T> })
			? T[]
			: never
	);
