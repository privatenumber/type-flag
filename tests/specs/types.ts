import { testSuite } from 'manten';
import { expectTypeOf } from 'expect-type';
import { typeFlag, type Flags } from '#type-flag';

export default testSuite(({ describe }) => describe('Types', ({ test }) => {
	test('typeFlag return type', () => {
		const parsed = typeFlag({
			booleanFlag: Boolean,
			booleanFlagDefault: {
				type: Boolean,
				default: false,
			},
			stringFlag: String,
			stringFlagDefault: {
				type: String,
				default: 'hello',
			},
			numberFlag: Number,
			numberFlagDefault: {
				type: Number,
				default: 1,
			},
			extraOptions: {
				type: Boolean,
				alias: 'e',
				default: false,
				description: 'Some description',
			},
			anotherFlag: {
				type: String,
				alias: 'a',
			},
		});

		type ExpectedType = {
			flags: {
				booleanFlag: boolean | undefined;
				booleanFlagDefault: boolean;
				stringFlag: string | undefined;
				stringFlagDefault: string;
				numberFlag: number | undefined;
				numberFlagDefault: number;
				extraOptions: boolean;
				anotherFlag: string | undefined;
			};
			unknownFlags: {
				[flag: string]: (string | boolean)[];
			};
			_: string[] & { '--': string[] };
		};

		expectTypeOf(parsed).toEqualTypeOf<ExpectedType>();
	});

	test('Flags type with custom options', () => {
		type CustomOptions = {
			description: string;
		};

		const customFlags: Flags<CustomOptions> = {
			verbose: {
				type: Boolean,
				alias: 'v',
				description: 'Enable verbose logging',
			},
			silent: Boolean,
		};

		expectTypeOf(customFlags).toEqualTypeOf<Flags<CustomOptions>>();
	});

	test('Flags type errors on invalid custom options', () => {
		type CustomOptions = {
			description: string;
		};

		expectTypeOf<{
			verbose: {
				type: BooleanConstructor;
				alias: string;
				description: number;
			};
		}>().not.toMatchObjectType<Flags<CustomOptions>>();
	});
}));
