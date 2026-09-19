/**
 * This example demonstrates how to invert a boolean flag
 *
 * Usage:
 * $ node --conditions=development ./examples/invert-boolean.ts --boolean=false
 */

import { typeFlag } from '#type-flag';

const parsed = typeFlag({
	boolean: Boolean,
});

console.log(parsed.flags.boolean);
