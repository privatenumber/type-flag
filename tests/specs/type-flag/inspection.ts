import { describe, test, expect } from 'manten';
import { inspectFlags } from '#type-flag';

describe('Inspection', () => {
	test('returns accepted tokens for schema flags', () => {
		const inspected = inspectFlags(
			{
				getID: String,
				verbose: {
					type: Boolean,
					alias: 'v',
				},
				tags: [String],
				x: Boolean,
			},
			{ booleanNegation: true },
		);

		expect(inspected).toStrictEqual([
			{
				name: 'getID',
				kebabName: 'get-id',
				longNames: ['getID', 'get-id'],
				tokens: ['--getID', '--get-id'],
				negatedTokens: [],
				isArray: false,
				isBoolean: false,
			},
			{
				name: 'verbose',
				kebabName: 'verbose',
				longNames: ['verbose'],
				alias: 'v',
				tokens: ['--verbose', '-v', '--no-verbose', '--no-v'],
				negatedTokens: ['--no-verbose', '--no-v'],
				isArray: false,
				isBoolean: true,
			},
			{
				name: 'tags',
				kebabName: 'tags',
				longNames: ['tags'],
				tokens: ['--tags'],
				negatedTokens: [],
				isArray: true,
				isBoolean: false,
			},
			{
				name: 'x',
				kebabName: 'x',
				longNames: [],
				tokens: ['-x', '--no-x'],
				negatedTokens: ['--no-x'],
				isArray: false,
				isBoolean: true,
			},
		]);
	});

	test('omits boolean negation tokens unless enabled', () => {
		const [inspected] = inspectFlags({
			verbose: Boolean,
		});

		expect(inspected?.tokens).toStrictEqual(['--verbose']);
		expect(inspected?.negatedTokens).toStrictEqual([]);
	});

	test('does not report negation tokens claimed by explicit flags', () => {
		const [verbose] = inspectFlags(
			{
				verbose: Boolean,
				noVerbose: Boolean,
			},
			{ booleanNegation: true },
		);

		expect(verbose?.tokens).toStrictEqual(['--verbose']);
		expect(verbose?.negatedTokens).toStrictEqual([]);
	});

	test('uses type-flag validation rules', () => {
		expect(() => {
			inspectFlags({
				flagA: String,
				'flag-a': String,
			});
		}).toThrow('Duplicate flags named "flag-a"');

		expect(() => {
			inspectFlags({
				verbose: {
					type: Boolean,
					alias: 'help',
				},
			});
		}).toThrow('Flag alias "help" for flag "verbose" must be a single character');
	});
});
