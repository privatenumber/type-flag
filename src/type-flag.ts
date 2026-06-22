import {
	type Flags,
	type TypeFlag,
	type TypeFlagOptions,
	type Simplify,
	type ConsumedArgvItem,
	KNOWN_FLAG,
	UNKNOWN_FLAG,
	ARGUMENT,
} from './types.ts';
import {
	createRegistry,
	normalizeBoolean,
	applyParser,
	finalizeParsed,
} from './utils.ts';
import {
	ALIAS_INDEX_LENGTH,
	argvIterator,
	spliceFromArgv,
	type Index,
} from './argv-iterator.ts';

/**
type-flag: typed argv parser

@param schemas - A map of flag names to flag schemas
@param argv - Optional argv array of strings. [Default: process.argv.slice(2)]
@returns Parsed argv flags

@example
```ts
import { typeFlag } from 'type-flag';

const parsed = typeFlag({
	foo: Boolean,
	bar: {
		type: Number,
		default: 8
	}
})
```
*/
export const typeFlag = <Schemas extends Flags>(
	schemas: Schemas,
	argv: string[] = process.argv.slice(2),
	{ ignore, booleanNegation }: TypeFlagOptions = {},
) => {
	const removeArgvs: Index[] = [];
	const flagRegistry = createRegistry(schemas);

	// The ordered, interpreted argv stream — the single source of truth that
	// `flags`, `unknownFlags`, and `_` are all derived from.
	const consumed: ConsumedArgvItem[] = [];

	// Pending value-expecting flag, read by `flushFlagValue` when the next token
	// arrives. Hoisted so value-taking flags don't allocate a callback closure
	// per occurrence (and keep the value-delivery call site monomorphic).
	let pendingName: string;
	let pendingParser: Parameters<typeof applyParser>[0];
	let pendingFlagIndex: Index;
	let pendingRawName: string;

	const flushFlagValue = (
		value: string | boolean | undefined,
		valueIndex?: Index,
	) => {
		// Remove parsed elements from the argv array
		removeArgvs.push(pendingFlagIndex);
		if (valueIndex) {
			removeArgvs.push(valueIndex);
		}

		consumed.push({
			type: KNOWN_FLAG,
			name: pendingName,
			value: applyParser(pendingParser, value || '', pendingRawName),
		});
	};

	argvIterator(argv, {
		knownFlags: flagRegistry,
		onFlag(name, explicitValue, flagIndex) {
			const isAlias = flagIndex.length === ALIAS_INDEX_LENGTH;
			// Long-form requires length > 1; single-char names are exclusive to short-form (-h vs --help)
			const isValid = isAlias || name.length > 1;
			const flagData = isValid ? flagRegistry.get(name) : undefined;

			let negatedBaseName: string | undefined;
			if (
				!flagData
				&& booleanNegation
				&& !isAlias
				&& name.length > 3
				&& name.startsWith('no-')
			) {
				const baseData = flagRegistry.get(name.slice(3));
				if (baseData && baseData[1] === Boolean) {
					[negatedBaseName] = baseData;
				}
			}

			if (
				ignore?.(
					flagData || negatedBaseName ? KNOWN_FLAG : UNKNOWN_FLAG,
					name,
					explicitValue,
				)
			) {
				return;
			}

			if (flagData) {
				const [canonicalName, parser] = flagData;
				pendingName = canonicalName;
				pendingParser = parser;
				pendingFlagIndex = flagIndex;
				pendingRawName = name;

				const flagValue = normalizeBoolean(parser, explicitValue);
				if (flagValue === undefined) {
					// No inline value: expect the next token as this flag's value.
					return true;
				}

				flushFlagValue(flagValue);
				return;
			}

			if (negatedBaseName) {
				consumed.push({
					type: KNOWN_FLAG,
					name: negatedBaseName,
					value: false,
				});
				removeArgvs.push(flagIndex);
				return;
			}

			consumed.push({
				type: UNKNOWN_FLAG,
				name,
				value: explicitValue === undefined ? true : explicitValue,
			});
			removeArgvs.push(flagIndex);
		},

		onValue: flushFlagValue,

		onArgument: (args, index, isEoF) => {
			if (ignore?.(ARGUMENT, argv[index[0]])) {
				return;
			}

			for (const value of args) {
				consumed.push(
					isEoF
						? {
							type: ARGUMENT,
							value,
							afterDoubleDash: true,
						}
						: {
							type: ARGUMENT,
							value,
						},
				);
			}

			if (isEoF) {
				argv.splice(index[0]);
			} else {
				removeArgvs.push(index);
			}
		},
	});

	spliceFromArgv(argv, removeArgvs);

	return {
		...finalizeParsed(schemas, flagRegistry, consumed),
		consumed,
	} as Simplify<TypeFlag<Schemas>>;
};
