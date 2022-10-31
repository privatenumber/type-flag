import { expectType } from 'tsd';
import typeFlag from '../dist/index.js';

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
	};
	unknownFlags: {
		[flag: string]:(string | boolean)[];
	};
	_: string[] & { '--': string[] };
};

expectType<ExpectedType>(parsed);
