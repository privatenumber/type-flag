import {
	type Flags,
	type TypeFlag,
	type TypeFlagOptions,
	type UnknownFlags,
	type PositionalArguments,
	KNOWN_FLAG,
	UNKNOWN_FLAG,
	ARGUMENT,
} from './types';
import {
	hasOwn,
	createRegistry,
	normalizeBoolean,
	applyParser,
	finalizeFlags,
} from './utils';
import {
	DOUBLE_DASH,
	argvIterator,
	spliceFromArgv,
	type Index,
} from './argv-iterator';

/**
type-flag: typed argv parser

@param schemas - A map of flag names to flag schemas
@param argv - Optional argv array of strings. [Default: process.argv.slice(2)]
@returns Parsed argv flags

@example
```ts
import typeFlag from 'type-flag';

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
	{ ignore }: TypeFlagOptions = {},
) => {
	const removeArgvs: Index[] = [];
	const flagRegistry = createRegistry(schemas);
	const unknownFlags: UnknownFlags = {};
	const _ = [] as unknown as PositionalArguments;
	_[DOUBLE_DASH] = [];

	argvIterator(argv, {
		onFlag(name, explicitValue, flagIndex) {
			const isAlias = flagIndex.length === 3;
			const isValid = isAlias || name.length > 1;
			const isKnownFlag = isValid && hasOwn(flagRegistry, name);
			if (
				ignore?.(
					isKnownFlag ? KNOWN_FLAG : UNKNOWN_FLAG,
					name,
					explicitValue,
				)
			) {
				return;
			}

			if (isKnownFlag) {
				const [values, parser] = flagRegistry[name];
				const flagValue = normalizeBoolean(parser, explicitValue);
				const getFollowingValue = (
					value?: string | boolean,
					valueIndex?: Index,
				) => {
					// Remove elements from argv array
					removeArgvs.push(flagIndex);
					if (valueIndex) {
						removeArgvs.push(valueIndex);
					}

					values.push(
						applyParser(parser, value || ''),
					);
				};

				return (
					flagValue === undefined
						? getFollowingValue
						: getFollowingValue(flagValue)
				);
			}

			if (!hasOwn(unknownFlags, name)) {
				unknownFlags[name] = [];
			}

			unknownFlags[name].push(
				explicitValue === undefined ? true : explicitValue,
			);
			removeArgvs.push(flagIndex);
		},

		onArgument: (args, index, isEoF) => {
			if (ignore?.(ARGUMENT, argv[index[0]])) {
				return;
			}

			_.push(...args);

			if (isEoF) {
				_[DOUBLE_DASH] = args;
				argv.splice(index[0]);
			} else {
				removeArgvs.push(index);
			}
		},
	});

	spliceFromArgv(argv, removeArgvs);

	type Result = TypeFlag<Schemas>;
	return {
		flags: finalizeFlags(schemas, flagRegistry),
		unknownFlags,
		_,
	} as {
		// This exposes the content of "TypeFlag<T>" in type hints
		[Key in keyof Result]: Result[Key];
	};
};
