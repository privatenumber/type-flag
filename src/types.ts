export type TypeFunction = (argvValue: any) => any;

export type FlagSchema = {
	type?: TypeFunction;
	alias?: string;
};

export type FlagTypeOrSchema = TypeFunction | FlagSchema;

export type Flags = {
	[flagName: string]: FlagTypeOrSchema;
};

export type ParsedFlags = {
	[flag: string]: (string | boolean)[];
};

export type GetFlagType<Flag extends FlagTypeOrSchema> = (
	Flag extends TypeFunction
		? Flag
		: (
			Flag extends { type: TypeFunction }
				? Flag['type']
				: StringConstructor
		)
);

export type InferFlagReturnType<Flag extends FlagTypeOrSchema> = ReturnType<
	GetFlagType<Flag>
>;
