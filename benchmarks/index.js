import { parseArgs } from 'node:util';
import { Bench } from 'tinybench';
import minimist from 'minimist';
import arg from 'arg';
import { typeFlag, getFlag } from '../dist/index.mjs';

const bench = new Bench({ time: 1000 });

bench
	.add('minimist', () => {
		minimist(process.argv.slice(2));
	})
	.add('type-flag', () => {
		typeFlag({
			hello: String,
		});
	})
	.add('parseArgs', () => {
		parseArgs({
			hello: {
				type: 'string',
			},
		});
	})
	.add('get-flag', () => {
		getFlag('--hello', String);
	})
	.add('arg', () => {
		arg({
			'--hello': String,
		});
	})
	.add('empty', () => {
		(a => a)(process.argv.slice(2));
	});

await bench.warmup(); // make results more reliable, ref: https://github.com/tinylibs/tinybench/pull/50
await bench.run();

console.table(bench.table());
