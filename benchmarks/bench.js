import { parseArgs } from 'node:util';
import { Bench } from 'tinybench';
import minimist from 'minimist';
import arg from 'arg';
import { typeFlag, getFlag } from '../dist/index.mjs';

const bench = new Bench({ time: 1000 });

// A more realistic argv for testing parsing performance.
// The previous benchmark used an empty array, which only measured setup cost.
const sampleArgv = [
	'--hello',
	'world',
	'--boolean',
	'-a', // alias for age
	'25',
	'some-arg',
	'--unknown-flag=test',
	'another-arg',
];

bench
	.add('minimist', () => {
		// minimist doesn't mutate the array
		minimist(sampleArgv);
	})
	.add('type-flag', () => {
		// type-flag mutates the array, so we pass a copy
		typeFlag({
			hello: String,
			boolean: Boolean,
			age: {
				type: Number,
				alias: 'a',
			},
		}, sampleArgv.slice());
	})
	.add('parseArgs', () => {
		// parseArgs doesn't mutate the array
		parseArgs({
			args: sampleArgv,
			options: {
				hello: {
					type: 'string',
				},
				boolean: {
					type: 'boolean',
				},
				age: {
					type: 'string',
					short: 'a',
				},
			},
			allowPositionals: true,
			strict: false,
		});
	})
	.add('get-flag', () => {
		// get-flag mutates the array, so we pass a copy
		getFlag('--age, -a', Number, sampleArgv.slice());
	})
	.add('arg', () => {
		// arg doesn't mutate the array by default
		arg({
			'--hello': String,
			'--boolean': Boolean,
			'--age': Number,
			'-a': '--age',
		}, {
			argv: sampleArgv,
			permissive: true,
		});
	})
	.add('noop baseline', () => {
		// Just a baseline for function call overhead
		(a => a)(sampleArgv);
	});

await bench.warmup(); // make results more reliable, ref: https://github.com/tinylibs/tinybench/pull/50
await bench.run();

console.table(bench.table());
