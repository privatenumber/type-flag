export type TypeFunction = (argvValue: any) => any;

export type FlagSchema = {
	type?: TypeFunction;
	alias?: string;
};

export type Flags = {
	[flagName: string]: TypeFunction | FlagSchema;
};

export type ParsedFlags = {
	[flag: string]: (string | boolean)[];
};

export type InferFlagType<Flag extends (TypeFunction | FlagSchema)> = ReturnType<
	Flag extends TypeFunction
		? Flag
		: (
			Flag extends { type: TypeFunction }
				? Flag['type']
				: StringConstructor
		)
>;

export const isFlagSchemaWithType = (
	schema: FlagSchema,
): schema is { type: TypeFunction } => (
	('type' in schema)
	&& (typeof schema.type === 'function')
);
