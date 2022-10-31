/**
 * This example demonstrates how to invert a boolean flag
 *
 * Usage:
 * $ npx tsx ./examples/invert-boolean --boolean=false
 */

import typeFlag from '#type-flag';

const parsed = typeFlag({
	boolean: Boolean,
});

console.log(parsed.flags.boolean);
