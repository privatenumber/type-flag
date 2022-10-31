/**
 * This example demonstrates how to count the number of flags
 *
 * Usage:
 * $ npx tsx ./examples/count-flags -vvv
 */

import typeFlag from '#type-flag';

const parsed = typeFlag({
	verbose: {
		type: [Boolean],
		alias: 'v',
	},
});

console.log(parsed.flags.verbose.length);
