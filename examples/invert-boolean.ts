/**
 * This example demonstrates how to invert a boolean flag
 *
 * Usage:
 * $ npx esno ./examples/invert-boolean --boolean=false
 */

import { typeFlag } from '..';

const parsed = typeFlag({
	boolean: Boolean,
});

console.log(parsed.flags.boolean);
