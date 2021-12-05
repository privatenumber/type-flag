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
		// Constructor function
		? Flag

		// Schema object
		: (
			Flag extends { type: TypeFunction }
				// Constructor function
				? Flag['type']

				// Fallback to string
				: StringConstructor
		)
>;
