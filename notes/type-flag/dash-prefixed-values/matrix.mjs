// Usage: node matrix.mjs <dependencies-directory>
// The parsers are installed in a scratch directory (see ../dash-prefixed-values.md),
// so they are loaded from there instead of this repository's node_modules.
import { createRequire } from 'node:module';
import process from 'node:process';
import { parseArgs } from 'node:util';

const depsDir = process.argv[2];
const require = createRequire(`${depsDir}/package.json`);
const [
	{ Command },
	yargsParser,
	minimist,
	mri,
	argument,
] = ['commander', 'yargs-parser', 'minimist', 'mri', 'arg'].map(name => require(name));
const { typeFlag } = await import(require.resolve('type-flag'));

const inputs = [
	['--range', '-5'],
	['--range', '-5..10'],
	['--range', '-5%'],
	['--range', '-.5x'],
	['--range', '--verbose'],
];

const tryRun = (run) => {
	try {
		return JSON.stringify(run());
	} catch (error) {
		return `throws: ${error.message.split('\n')[0]}`;
	}
};

const parsers = {
	'node parseArgs (strict)': argv => parseArgs({
		args: argv,
		options: {
			range: { type: 'string' },
			verbose: { type: 'boolean' },
		},
	}).values,
	'node parseArgs (strict: false)': argv => parseArgs({
		args: argv,
		strict: false,
		options: {
			range: { type: 'string' },
			verbose: { type: 'boolean' },
		},
	}).values,
	'commander (required)': (argv) => {
		const program = new Command().exitOverride().allowUnknownOption().option('--range <value>')
			.option('--verbose');
		program.parse(argv, { from: 'user' });
		return {
			...program.opts(),
			args: program.args,
		};
	},
	'yargs-parser': (argv) => {
		const { _, ...rest } = yargsParser(argv, {
			string: ['range'],
			boolean: ['verbose'],
			configuration: { 'camel-case-expansion': false },
		});
		return {
			...rest,
			_,
		};
	},
	minimist: argv => minimist(argv, {
		string: ['range'],
		boolean: ['verbose'],
	}),
	mri: argv => mri(argv, {
		string: ['range'],
		boolean: ['verbose'],
	}),
	arg: argv => argument({
		'--range': String,
		'--verbose': Boolean,
	}, { argv }),
	'type-flag': (argv) => {
		const { flags, unknownFlags, _ } = typeFlag({
			range: String,
			verbose: Boolean,
		}, argv);
		return {
			...flags,
			unknownFlags: { ...unknownFlags },
			_: [..._],
		};
	},
};

for (const [name, run] of Object.entries(parsers)) {
	console.log(`## ${name}`);
	for (const argv of inputs) {
		console.log(`${argv.join(' ')}\t=> ${tryRun(() => run([...argv]))}`);
	}
}
