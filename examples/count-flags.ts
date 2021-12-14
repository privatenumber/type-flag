/**
 * This example demonstrates how to count the number of flags
 *
 * Usage:
 * $ npx esno ./examples/count-flags -vvv
 */

import typeFlag from '..';

const parsed = typeFlag({
	verbose: {
		type: [Boolean],
		alias: 'v',
	},
});

console.log(parsed.flags.verbose.length);
