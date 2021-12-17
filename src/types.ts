export type TypeFunction<ReturnType = any> = (value: any) => ReturnType;

type TypeFunctionArray<ReturnType = any> = readonly [TypeFunction<ReturnType>];

type FlagSchemaBase<TF> = {
	type: TF;
	alias?: string;
};

type FlagSchemaDefault<TF, DefaultType = any> = FlagSchemaBase<TF> & {
	default: DefaultType | (() => DefaultType);
};

export type FlagSchema<TF = TypeFunction | TypeFunctionArray> = (
	FlagSchemaBase<TF>
	| FlagSchemaDefault<TF>
);

export type FlagTypeOrSchema<
	ExtraOptions = Record<string, unknown>
> = TypeFunction | TypeFunctionArray | (FlagSchema & ExtraOptions);

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

export type TypeFlag<Schemas extends Flags> = {
	flags: {
		[flag in keyof Schemas]: InferFlagType<Schemas[flag]>;
	};
	unknownFlags: {
		[flag: string]: (string | boolean)[];
	};
	_: string[];
};
