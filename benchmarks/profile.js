import { typeFlag } from '../dist/index.mjs';

// Simulate a larger argv array
const sampleArgv = [
	'--hello',
	'world',
	'--boolean',
	'-a',
	'25',
	'some-arg',
	'--unknown-flag=test',
	'another-arg',
	'--name=Jane',
	'--colors',
	'red',
	'--colors',
	'blue',
	'--debug',
	'--define:key=value',
	'--define:mode=prod',
	'--env.TOKEN=abc123',
	'--env.CI',
	'--features',
	'a',
	'--features',
	'b',
	'--features',
	'c',
	'--size',
	'medium',
	'--count',
	'--count',
	'--count',
	'--string-or-bool',
	'--string-or-bool',
	'val',
	'--nullable',
	'null',
	'--nested.flag=someval',
	'--verbose',
	'-vvv',
];

const inputSpec = {
	hello: String,
	boolean: Boolean,
	age: {
		type: Number,
		alias: 'a',
	},
	name: String,
	colors: [String],
	debug: Boolean,
	define: [String],
	env: {
		type: [(value) => {
			const [key, value_] = value.split('=');
			return { [key]: value_ ?? true };
		}],
	},
	features: [String],
	size: (value) => {
		if (!['small', 'medium', 'large'].includes(value)) { throw new Error('Invalid size'); }
		return value;
	},
	count: [Boolean],
	stringOrBool: value => (value === '' ? true : value),
	nullable: value => (value === 'null' ? null : value),
	nestedFlag: {
		type: String,
	},
	verbose: {
		type: [Boolean],
		alias: 'v',
	},
};

for (let i = 0; i < 1e6; i += 1) {
	typeFlag(inputSpec, [...sampleArgv]);
}
