import type {
	TypeFunction,
	FlagSchema,
	Flags,
	ParsedFlags,
} from './types';
import { isFlagSchemaWithType } from './types';
import {
	camelize,
	createFlagsObject,
	mapAliases,
	parseFlag,
	getDefaultFromTypeWithValue,
} from './utils';

const isAliasPattern = /^-[\da-z]+/i;
const isFlagPattern = /^--[\w-]{2,}/;

export default function typeFlag<Schemas extends Flags>(
	argv: string[],
	schemas: Schemas,
) {
	const aliasesMap = mapAliases(schemas);
	const flags = createFlagsObject<Schemas>(schemas);
	const unknownFlags: ParsedFlags = {};
	const remainingArguments: string[] = [];

	let expectingValue: undefined | ((value?: string | boolean) => void);

	const setKnown = (
		flagName: string,
		flagSchema: TypeFunction | FlagSchema,
		flagValue: any,
	) => {
		const flagType = (
			typeof flagSchema === 'function'
				? flagSchema
				: (
					isFlagSchemaWithType(flagSchema)
						? flagSchema.type
						: String
				)
		);

		flagValue = getDefaultFromTypeWithValue(flagType, flagValue);

		if (flagValue !== undefined && !Number.isNaN(flagValue)) {
			flags[flagName].push(flagType(flagValue));
		} else {
			expectingValue = (value) => {
				flags[flagName].push(flagType(getDefaultFromTypeWithValue(flagType, value || '')));
				expectingValue = undefined;
			};
		}
	};

	const setUnknown = (
		flagName: string,
		flagValue: any,
	) => {
		if (!(flagName in unknownFlags)) {
			unknownFlags[flagName] = [];
		}

		if (flagValue !== undefined) {
			unknownFlags[flagName].push(flagValue);
		} else {
			expectingValue = (value = true) => {
				unknownFlags[flagName].push(value);
				expectingValue = undefined;
			};
		}
	};

	for (let i = 0; i < argv.length; i += 1) {
		const argvElement = argv[i];

		if (argvElement === '--') {
			remainingArguments.push(...argv.slice(i + 1));
			break;
		}

		const isAlias = isAliasPattern.test(argvElement);
		const isFlag = isFlagPattern.test(argvElement);

		if (isFlag || isAlias) {
			if (expectingValue) {
				expectingValue();
			}

			const parsedFlag = parseFlag(argvElement);
			const { flagValue } = parsedFlag;
			let { flagName } = parsedFlag;

			if (isAlias) {
				const aliases = flagName.split('');
				for (let j = 0; j < aliases.length; j += 1) {
					const alias = aliases[j];
					const hasAlias = aliasesMap.get(alias);
					const isLast = j === aliases.length - 1;

					if (hasAlias) {
						setKnown(
							hasAlias.name,
							hasAlias.schema,
							isLast ? flagValue : true,
						);
					} else {
						setUnknown(alias, isLast ? flagValue : true);
					}
				}
				continue;
			}

			let flagSchema = schemas[flagName];

			if (!flagSchema) {
				const camelized = camelize(flagName);
				flagSchema = schemas[camelized];

				if (flagSchema) {
					flagName = camelized;
				}
			}

			if (!flagSchema) {
				setUnknown(flagName, flagValue);
				continue;
			}

			setKnown(flagName, flagSchema, flagValue);
		} else if (expectingValue) { // Not a flag, but expecting a value
			expectingValue(argvElement);
		} else { // Unexpected value
			remainingArguments.push(argvElement);
		}
	}

	if (expectingValue) {
		expectingValue();
	}

	return {
		flags,
		unknownFlags,
		_: remainingArguments,
	};
}
