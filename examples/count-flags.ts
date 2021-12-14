/**
 * This example demonstrates how to invert a boolean flag
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
