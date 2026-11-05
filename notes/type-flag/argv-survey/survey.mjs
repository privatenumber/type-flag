// Usage: node survey.mjs <dependencies-directory> [clap-binary]
// Runs every case in cases.json through each parser and prints one Markdown table per topic.
// Every parser gets the same schema:
//   --name/-n     string
//   --verbose/-v  boolean (with --no-verbose where the parser supports negation)
//   --count/-c    number
//   --size/-s     string whose validator rejects "bad"
//   --über        string
//   --eacute/-é   boolean
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

const [depsDirectory, clapBinary] = process.argv.slice(2);
const require = createRequire(path.resolve(depsDirectory, 'package.json'));
const [
	{ Command, InvalidArgumentError },
	yargsParser,
	minimist,
	mri,
	argument,
] = ['commander', 'yargs-parser', 'minimist', 'mri', 'arg'].map(name => require(name));
const { typeFlag } = await import(require.resolve('type-flag'));

const here = path.dirname(new URL(import.meta.url).pathname);
const cases = JSON.parse(fs.readFileSync(path.join(here, 'cases.json'), 'utf8'));

const knownKeys = ['name', 'verbose', 'count', 'size', 'über', 'eacute'];
const aliasKeys = new Set(['n', 'v', 'c', 's', 'é', '_', '--']);

const validateSize = (value) => {
	if (value === 'bad') {
		throw new Error('bad size');
	}
	return value;
};

// Compact cell: `name="foo" verbose=true _=["x"] ?5=true`. `?` marks an unknown flag.
const format = (values, positionals = [], unknown = {}) => {
	const parts = [];
	for (const key of knownKeys) {
		if (values[key] !== undefined) {
			parts.push(`${key}=${Number.isNaN(values[key]) ? 'NaN' : JSON.stringify(values[key])}`);
		}
	}
	if (positionals.length > 0) {
		parts.push(`_=${JSON.stringify(positionals)}`);
	}
	for (const [key, value] of Object.entries(unknown)) {
		parts.push(`?${key}=${JSON.stringify(value)}`);
	}
	return parts.join(' ') || '(nothing)';
};

const unknownOf = result => Object.fromEntries(
	Object.entries(result).filter(([key]) => !knownKeys.includes(key) && !aliasKeys.has(key)),
);

const parsers = {
	'node parseArgs': (argv) => {
		const { values, positionals } = parseArgs({
			args: argv,
			allowPositionals: true,
			allowNegative: true,
			options: {
				name: {
					type: 'string',
					short: 'n',
				},
				verbose: {
					type: 'boolean',
					short: 'v',
				},
				count: {
					type: 'string',
					short: 'c',
				},
				size: {
					type: 'string',
					short: 's',
				},
				über: { type: 'string' },
				eacute: {
					type: 'boolean',
					short: 'é',
				},
			},
		});
		return format(values, positionals);
	},
	commander: (argv) => {
		const program = new Command()
			.exitOverride()
			.configureOutput({
				writeOut: () => {},
				writeErr: () => {},
			})
			.allowExcessArguments()
			.option('-n, --name <value>')
			.option('-v, --verbose')
			.option('--no-verbose')
			.option('-c, --count <value>', '', Number)
			.option('-s, --size <value>', '', (value) => {
				if (value === 'bad') {
					throw new InvalidArgumentError('bad size');
				}
				return value;
			})
			.option('--über <value>')
			.option('-é, --eacute');
		program.parse(argv, { from: 'user' });
		return format(program.opts(), program.args);
	},
	'yargs-parser': (argv) => {
		const { argv: result, error } = yargsParser.detailed(argv, {
			string: ['name', 'size', 'über'],
			boolean: ['verbose', 'eacute'],
			number: ['count'],
			alias: {
				name: 'n',
				verbose: 'v',
				count: 'c',
				size: 's',
				eacute: 'é',
			},
			coerce: { size: validateSize },
		});
		if (error) {
			throw error;
		}
		return format(result, result._, unknownOf(result));
	},
	minimist: (argv) => {
		const result = minimist(argv, {
			string: ['name', 'size', 'über'],
			boolean: ['verbose', 'eacute'],
			alias: {
				name: 'n',
				verbose: 'v',
				count: 'c',
				size: 's',
				eacute: 'é',
			},
		});
		return format(result, result._, unknownOf(result));
	},
	mri: (argv) => {
		const result = mri(argv, {
			string: ['name', 'size', 'über'],
			boolean: ['verbose', 'eacute'],
			alias: {
				name: 'n',
				verbose: 'v',
				count: 'c',
				size: 's',
				eacute: 'é',
			},
		});
		return format(result, result._, unknownOf(result));
	},
	arg: (argv) => {
		const result = argument({
			'--name': String,
			'-n': '--name',
			'--verbose': Boolean,
			'-v': '--verbose',
			'--count': Number,
			'-c': '--count',
			'--size': validateSize,
			'-s': '--size',
			'--über': String,
			'--eacute': Boolean,
			'-é': '--eacute',
		}, { argv });
		return format(
			Object.fromEntries(Object.entries(result).map(([key, value]) => [key.replace(/^--/, ''), value])),
			result._,
		);
	},
	'type-flag': (argv) => {
		const { flags, unknownFlags, _ } = typeFlag({
			name: {
				type: String,
				alias: 'n',
			},
			verbose: {
				type: Boolean,
				alias: 'v',
			},
			count: {
				type: Number,
				alias: 'c',
			},
			size: {
				type: validateSize,
				alias: 's',
			},
			über: String,
			eacute: {
				type: Boolean,
				alias: 'é',
			},
		}, argv, { booleanNegation: true });
		return format(flags, [..._], unknownFlags);
	},
	argparse: argv => execFileSync('python3.14', ['-I', path.join(here, 'argparse_survey.py'), ...argv], { encoding: 'utf8' }).trim(),
};

if (clapBinary) {
	parsers.clap = argv => execFileSync(clapBinary, argv, { encoding: 'utf8' }).trim();
}

const run = (parse, argv) => {
	try {
		return parse([...argv]);
	} catch (error) {
		return `error: ${error.message.split('\n')[0].replace(/^error: /, '')}`;
	}
};

const escapeCell = text => text.replaceAll('|', String.raw`\|`);

for (const [topic, topicCases] of Object.entries(cases)) {
	console.log(`### ${topic}\n`);
	console.log(`| Parser | ${topicCases.map(argv => `\`${argv.join(' ')}\``).join(' | ')} |`);
	console.log(`| --- |${' --- |'.repeat(topicCases.length)}`);
	for (const [name, parse] of Object.entries(parsers)) {
		const cells = topicCases.map(argv => escapeCell(run(parse, argv)));
		console.log(`| ${name} | ${cells.join(' | ')} |`);
	}
	console.log('');
}
