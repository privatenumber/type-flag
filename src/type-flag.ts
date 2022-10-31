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

	argvIterator(argv, {
		onFlag(name, explicitValue, index) {
			if (hasOwn(flagRegistry, name)) {
				const [parser, values] = flagRegistry[name];
				const flagValue = normalizeBoolean(parser, explicitValue);
				const getFollowingValue = (value?: string | boolean) => {
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
				_.push(argv[index]);
			} else {
				if (!hasOwn(unknownFlags, name)) {
					unknownFlags[name] = [];
				}

				unknownFlags[name].push(
					explicitValue === undefined ? true : explicitValue,
				);
			}
		},

		onArgument(argvElement) {
			_.push(argvElement);
		},

		// merge with onArgument?
		onEoF(args) {
			_.push(...args);
			_[DOUBLE_DASH] = args;
		},
	});

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
