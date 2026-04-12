/**
 * This example demonstrates how to count the number of flags
 *
 * Usage:
 * $ node --conditions=development ./examples/count-flags.ts -vvv
 */

import { typeFlag } from '#type-flag';

const parsed = typeFlag({
	verbose: {
		type: [Boolean],
		alias: 'v',
	},
});

console.log(parsed.flags.verbose.length);
