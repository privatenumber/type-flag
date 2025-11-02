/* eslint-disable
	func-names,
	no-useless-computed-key,
	pvtnbr/prefer-arrow-functions,
	@eslint-community/eslint-comments/disable-enable-pair
*/
import { parseArgs } from 'node:util';
import { run, bench, summary } from 'mitata';
import minimist from 'minimist';
import arg from 'arg';
import { typeFlag, getFlag } from '../dist/index.mjs';

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

summary(() => {
	bench('noop baseline', () => {
		// Just a baseline for function call overhead
		(a => a)(sampleArgv);
	});

	bench('minimist', () => {
		// minimist doesn't mutate the array
		minimist(sampleArgv);
	});

	bench('type-flag', function* () {
		// type-flag mutates the array, so we use computed parameters
		yield {
			[0]() {
				return sampleArgv.slice();
			},

			bench(argv) {
				typeFlag({
					hello: String,
					boolean: Boolean,
					age: {
						type: Number,
						alias: 'a',
					},
				}, argv);
			},
		};
	});

	bench('parseArgs (node:util)', () => {
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
	});

	bench('get-flag (type-flag)', function* () {
		// get-flag mutates the array, so we use computed parameters
		yield {
			[0]() {
				return sampleArgv.slice();
			},

			bench(argv) {
				getFlag('--age, -a', Number, argv);
			},
		};
	});

	bench('arg', () => {
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
	});
});

await run();
