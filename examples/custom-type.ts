/**
 * This example demonstrates how to create a custom type
 *
 * Usage:
 * $ npx tsx ./examples/count-flags --size medium
 */

import typeFlag from '#type-flag';

const possibleSizes = ['small', 'medium', 'large'] as const;

type Sizes = typeof possibleSizes[number];

function Size(size: Sizes) {
	if (!possibleSizes.includes(size)) {
		throw new Error(`Invalid size: "${size}"`);
	}

	return size;
}

const parsed = typeFlag({
	size: {
		type: Size,
	},
});

console.log(parsed.flags);
