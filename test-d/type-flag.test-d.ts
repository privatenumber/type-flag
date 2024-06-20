import { expectType } from 'tsd';
import { typeFlag } from '#type-flag';

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
	a: String,
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
		a: string | undefined;
	};
	unknownFlags: {
		[flag: string]: (string | boolean)[];
	};
	_: string[] & { '--': string[] };
};

expectType<ExpectedType>(parsed);
