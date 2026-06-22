import {
	type Flags,
	type TypeFlag,
	type TypeFlagOptions,
	type Simplify,
	KNOWN_FLAG,
	UNKNOWN_FLAG,
	ARGUMENT,
} from './types.ts';
import {
	hasOwn,
	createRegistry,
	normalizeBoolean,
	applyParser,
	finalizeFlags,
} from './utils.ts';
import { createPositionalArgumentsFromParts } from './positional-arguments.ts';
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
	const unknownFlags: TypeFlag['unknownFlags'] = {};
	const positionals: string[] = [];
	let doubleDashArguments: string[] = [];

	// Pending value-expecting flag, read by `flushFlagValue`. Hoisted so
	// value-taking flags don't allocate a callback closure per occurrence
	// (and keep the value-delivery call site monomorphic).
	let pendingValues: unknown[];
	let pendingParser: Parameters<typeof applyParser>[0];
	let pendingFlagIndex: Index;
	let pendingName: string;

	const flushFlagValue = (
		value: string | boolean | undefined,
		valueIndex?: Index,
	) => {
		// Remove parsed elements from the argv array
		removeArgvs.push(pendingFlagIndex);
		if (valueIndex) {
			removeArgvs.push(valueIndex);
		}

		pendingValues.push(applyParser(pendingParser, value || '', pendingName));
	};

	argvIterator(argv, {
		knownFlags: flagRegistry,
		onFlag(name, explicitValue, flagIndex) {
			const isAlias = flagIndex.length === ALIAS_INDEX_LENGTH;
			// Long-form requires length > 1; single-char names are exclusive to short-form (-h vs --help)
			const isValid = isAlias || name.length > 1;
			const flagData = isValid ? flagRegistry.get(name) : undefined;

			let negatedBaseValues: unknown[] | undefined;
			if (
				!flagData
				&& booleanNegation
				&& !isAlias
				&& name.length > 3
				&& name.startsWith('no-')
			) {
				const baseData = flagRegistry.get(name.slice(3));
				if (baseData && baseData[1] === Boolean) {
					negatedBaseValues = baseData[0];
				}
			}

			if (
				ignore?.(
					flagData || negatedBaseValues ? KNOWN_FLAG : UNKNOWN_FLAG,
					name,
					explicitValue,
				)
			) {
				return;
			}

			if (flagData) {
				const [values, parser] = flagData;
				pendingValues = values;
				pendingParser = parser;
				pendingFlagIndex = flagIndex;
				pendingName = name;

				const flagValue = normalizeBoolean(parser, explicitValue);
				if (flagValue === undefined) {
					// No inline value: expect the next token as this flag's value.
					return true;
				}

				flushFlagValue(flagValue);
				return;
			}

			if (negatedBaseValues) {
				negatedBaseValues.push(false);
				removeArgvs.push(flagIndex);
				return;
			}

			if (!hasOwn(unknownFlags, name)) {
				unknownFlags[name] = [];
			}

			unknownFlags[name].push(
				explicitValue === undefined ? true : explicitValue,
			);
			removeArgvs.push(flagIndex);
		},

		onValue: flushFlagValue,

		onArgument: (args, index, isEoF) => {
			if (ignore?.(ARGUMENT, argv[index[0]])) {
				return;
			}

			positionals.push(...args);

			if (isEoF) {
				doubleDashArguments = args;
				argv.splice(index[0]);
			} else {
				removeArgvs.push(index);
			}
		},
	});

	spliceFromArgv(argv, removeArgvs);

	return {
		flags: finalizeFlags(schemas, flagRegistry),
		unknownFlags,
		_: createPositionalArgumentsFromParts(positionals, doubleDashArguments),
	} as Simplify<TypeFlag<Schemas>>;
};
