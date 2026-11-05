// Usage: node type-flag-probes.mjs <dependencies-directory>
// Reproduces type-flag behaviors that have no cross-parser equivalent:
// `ignore` with value-taking flags, error naming, unreachable names, and getFlag.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const dependenciesDirectory = path.resolve(process.argv[2]);
const require = createRequire(path.join(dependenciesDirectory, 'package.json'));
// type-flag does not export `./package.json`, so read it from disk
const { version } = JSON.parse(fs.readFileSync(path.join(dependenciesDirectory, 'node_modules/type-flag/package.json'), 'utf8'));
const { typeFlag, getFlag } = await import(require.resolve('type-flag'));

const show = (label, run) => {
	let result;
	try {
		result = JSON.stringify(run(), (_key, value) => (Number.isNaN(value) ? 'NaN' : value));
	} catch (error) {
		result = `throws ${error.name}: ${error.message} (flagName: ${JSON.stringify(error.flagName)})`;
	}
	console.log(`| ${label} | ${result.replaceAll('|', String.raw`\|`)} |`);
};

const parse = (schema, argv, options) => {
	const remaining = [...argv];
	const { flags, unknownFlags, _ } = typeFlag(schema, remaining, options);
	return {
		flags: { ...flags },
		unknownFlags: { ...unknownFlags },
		_: [..._],
		argv: remaining,
	};
};

const take = (names, type, argv) => {
	const remaining = [...argv];
	return {
		value: getFlag(names, type, remaining),
		argv: remaining,
	};
};

const rejectBad = (value) => {
	if (value === 'bad') {
		throw new Error('bad size');
	}
	return value;
};

console.log(`type-flag ${version}\n`);
console.log('| Probe | Result |');
console.log('| --- | --- |');

show('ignore defined flags: `--name x pos`', () => parse({ name: String }, ['--name', 'x', 'pos'], { ignore: type => type === 'flag' || type === 'known-flag' })); // v4 names the type `known-flag`
show('ignore unknown flags: `--target value --name y`', () => parse({ name: String }, ['--target', 'value', '--name', 'y'], { ignore: type => type === 'unknown-flag' }));

show('alias error: `-s bad`', () => parse({
	size: {
		type: rejectBad,
		alias: 's',
	},
}, ['-s', 'bad']));
show('single-character flag error: `-x bad`', () => parse({ x: rejectBad }, ['-x', 'bad']));

show('define `über`, then `--über x`', () => parse({ über: String }, ['--über', 'x']));
show('define alias `é`, then `-é`', () => parse({
	eacute: {
		type: Boolean,
		alias: 'é',
	},
}, ['-é']));
show('define alias `=`, then `-=`', () => parse({
	name: {
		type: String,
		alias: '=',
	},
}, ['-=', 'x']));
show('define key `-x`, then `---x`', () => parse({ '-x': Boolean }, ['---x']));

show('getFlag(`-h`) with `--h`', () => take('-h', Boolean, ['--h']));
show('getFlag(`--a, -b`) with `-b`', () => take('--a, -b', Boolean, ['-b']));
show('getFlag(`a`) with `--a x`', () => take('a', String, ['--a', 'x']));
show('getFlag(`--name`) with `--name x --name y`', () => take('--name', String, ['--name', 'x', '--name', 'y']));
