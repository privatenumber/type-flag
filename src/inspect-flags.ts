import type {
	Flags,
	InspectedFlag,
	InspectFlagsOptions,
} from './types.ts';
import {
	flagNameToKebab,
	getFlagAlias,
	getFlagLongNames,
	hasOwn,
	parseFlagType,
	setFlag,
} from './utils.ts';

type FlagInspectionData = {
	alias?: string;
	flag: InspectedFlag;
	parser: unknown;
	registryNames: string[];
};

const getNormalTokens = (
	flagName: string,
	longNames: string[],
	alias?: string,
) => [
	...longNames.map(longName => `--${longName}`),
	...(flagName.length === 1 ? [`-${flagName}`] : []),
	...(alias ? [`-${alias}`] : []),
];

const inspectFlag = (
	registry: Record<string, string>,
	schemas: Flags,
	flagName: string,
): FlagInspectionData | undefined => {
	if (!hasOwn(schemas, flagName)) {
		return;
	}

	const schema = schemas[flagName];
	const longNames = getFlagLongNames(flagName);
	const alias = getFlagAlias(flagName, schema);
	const [parser, isArray] = parseFlagType(schema);

	for (const longName of longNames) {
		setFlag(registry, longName, flagName);
	}

	if (alias) {
		setFlag(registry, alias, flagName);
	}

	const acceptedLongNames = flagName.length === 1 ? [] : longNames;

	return {
		alias,
		parser,
		registryNames: [
			...longNames,
			...(alias ? [alias] : []),
		],
		flag: {
			name: flagName,
			kebabName: flagNameToKebab(flagName),
			longNames: acceptedLongNames,
			...(alias ? { alias } : {}),
			tokens: getNormalTokens(
				flagName,
				acceptedLongNames,
				alias,
			),
			negatedTokens: [],
			isArray,
			isBoolean: parser === Boolean,
		},
	};
};

const applyBooleanNegation = (
	registry: Record<string, string>,
	flags: FlagInspectionData[],
) => {
	for (const { flag, parser, registryNames } of flags) {
		if (parser !== Boolean) {
			continue;
		}

		const negatedTokens = registryNames
			.map(flagName => `no-${flagName}`)
			.filter(negatedFlagName => !hasOwn(registry, negatedFlagName))
			.map(negatedFlagName => `--${negatedFlagName}`);

		flag.negatedTokens = negatedTokens;
		flag.tokens = [
			...flag.tokens,
			...negatedTokens,
		];
	}
};

export const inspectFlags = (
	schemas: Flags,
	{ booleanNegation }: InspectFlagsOptions = {},
): InspectedFlag[] => {
	const registry: Record<string, string> = {};
	const flags: FlagInspectionData[] = [];
	for (const flagName in schemas) {
		if (!hasOwn(schemas, flagName)) {
			continue;
		}

		const flag = inspectFlag(registry, schemas, flagName);
		if (flag) {
			flags.push(flag);
		}
	}

	if (booleanNegation) {
		applyBooleanNegation(registry, flags);
	}

	return flags.map(({ flag }) => flag);
};
