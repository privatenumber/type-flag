import type {
	Flags,
	ParsedFlags,
	TypeFlag,
} from './types';
import {
	createRegistry,
	normalizeBoolean,
	applyParser,
	hasOwn,
} from './utils';
import {
	argvIterator,
	DOUBLE_DASH,
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
	options: {
		ignoreUnknown?: boolean;
	} = {},
) => {
	const { ignoreUnknown } = options;
	const [flagRegistry, flags] = createRegistry(schemas);
	const unknownFlags: ParsedFlags['unknownFlags'] = {};
	const _ = [] as unknown as ParsedFlags['_'];
	_[DOUBLE_DASH] = [];
	const removeArgvs: number[] = [];

	argvIterator(argv, {
		onFlag(name, explicitValue, flagIndex) {
			if (hasOwn(flagRegistry, name)) {
				const [parser, values] = flagRegistry[name];
				const flagValue = normalizeBoolean(parser, explicitValue);
				const getFollowingValue = (value?: string | boolean, valueIndex?: number) => {
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
			} if (ignoreUnknown) {
				_.push(argv[flagIndex]);
			} else {
				if (!hasOwn(unknownFlags, name)) {
					unknownFlags[name] = [];
				}

				unknownFlags[name].push(
					explicitValue === undefined ? true : explicitValue,
				);
			}
			removeArgvs.push(flagIndex);
		},

		onArgument(args, index, isEoF) {
			_.push(...args);

			if (isEoF) {
				_[DOUBLE_DASH] = args;
				argv.splice(index);
			} else {
				removeArgvs.push(index);
			}
		},
	});

	for (const i of removeArgvs.reverse()) {
		argv.splice(i, 1);
	}

	type Result = TypeFlag<Schemas>;
	return {
		flags,
		unknownFlags,
		_,
	} as {
		// This exposes the content of "TypeFlag<T>" in type hints
		[Key in keyof Result]: Result[Key];
	};
};
