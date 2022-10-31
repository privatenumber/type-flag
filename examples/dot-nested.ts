/**
 * This example demonstrates how a dot-nested object can be created
 *
 * Usage:
 * $ npx tsx ./examples/dot-nested --env.TOKEN=123 --env.CI
 */

import typeFlag from '#type-flag';

type Environment = {
	TOKEN?: string;
	CI?: boolean;
};

function EnvironmentObject(value: string): Environment {
	const [propertyName, propertyValue] = value.split('=');
	return {
		[propertyName]: propertyValue || true,
	};
}

const parsed = typeFlag({
	env: [EnvironmentObject],
});

// eslint-disable-next-line unicorn/no-array-reduce
const environment = parsed.flags.env.reduce((agg, next) => Object.assign(agg, next), {});

console.log(environment);
