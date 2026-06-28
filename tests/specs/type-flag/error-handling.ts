import { describe, test, expect } from 'manten';
import { typeFlag, FlagParseError } from '#type-flag';

describe('Error handling', () => {
	describe('Invalid flag name', () => {
		test('Empty flag name', () => {
			expect(() => {
				typeFlag({
					'': String,
				}, []);
			}).toThrow(/* 'Invalid flag name: empty' */);
		});

		test('Reserved characters', () => {
			expect(() => {
				typeFlag({ 'flag a': String }, []);
			}).toThrow(/* Flag name cannot contain the character " " */);

			expect(() => {
				typeFlag({ 'flag=b': String }, []);
			}).toThrow(/* Flag name cannot contain the character "=" */);

			expect(() => {
				typeFlag({ 'flag:c': String }, []);
			}).toThrow(/* Flag name cannot contain the character ":" */);

			expect(() => {
				typeFlag({ 'flag.d': String }, []);
			}).toThrow(/* Flag name cannot contain the character "." */);
		});

		test('Collision - camelCase to kebab-case', () => {
			expect(() => {
				typeFlag({
					flagA: String,
					'flag-a': String,
				}, []);
			}).toThrow(/* 'Invalid flag name "flagA": collides with flag "flag-a"' */);
		});

		test('Collision - kebab-case to camelCase', () => {
			expect(() => {
				typeFlag({
					'flag-a': String,
					flagA: String,
				}, []);
			}).toThrow(/* 'Invalid flag name "flag-a": collides with flag "flagA"' */);
		});
	});

	describe('Invalid alias', () => {
		test('Empty alias', () => {
			expect(() => {
				typeFlag({
					flagA: {
						type: String,
						alias: '',
					},
				}, []);
			}).toThrow(/* 'Empty alias' */);
		});

		test('Single-character alias', () => {
			expect(() => {
				typeFlag({
					a: {
						type: String,
						alias: 'b',
					},
				}, []);
			}).toThrow(

				/* Flag alias "b" for flag "a" cannot be defined for a single-character flag */
			);
		});

		test('Multi-character alias', () => {
			expect(() => {
				typeFlag({
					flagA: {
						type: String,
						alias: 'flag-a',
					},
				}, []);
			}).toThrow(/* 'Multi character' */);
		});

		test('Collision - alias to alias', () => {
			expect(() => {
				typeFlag({
					flagA: {
						type: String,
						alias: 'a',
					},
					flagB: {
						type: String,
						alias: 'a',
					},
				}, []);
			}).toThrow(/* 'Flag collision: Alias "a" is already used' */);
		});

		test('Collision - alias matches another flag name', () => {
			expect(() => {
				typeFlag({
					flagName: String,
					anotherFlag: {
						type: String,
						alias: 'flagName',
					},
				}, []);
			}).toThrow();
		});
	});

	describe('Custom type errors', () => {
		test('Custom parser throws error', () => {
			const ThrowingParser = (_value: string) => {
				throw new Error('Custom parse error');
			};

			expect(() => {
				typeFlag({
					custom: ThrowingParser,
				}, ['--custom', 'value']);
			}).toThrow('Flag "--custom": Custom parse error');
		});

		test('Thrown error is a FlagParseError exposing the flag name', () => {
			const ThrowingParser = (_value: string) => {
				throw new Error('Custom parse error');
			};

			let thrown: unknown;
			try {
				typeFlag({
					custom: ThrowingParser,
				}, ['--custom', 'value']);
			} catch (error) {
				thrown = error;
			}

			expect(thrown).toBeInstanceOf(FlagParseError);
			// Still a TypeError, so existing checks keep working
			expect(thrown).toBeInstanceOf(TypeError);
			expect((thrown as FlagParseError).name).toBe('FlagParseError');
			expect((thrown as FlagParseError).flagName).toBe('custom');
			expect((thrown as FlagParseError).message).toBe('Flag "--custom": Custom parse error');
		});

		test('Custom parser throws on specific value', () => {
			const StrictNumber = (value: string) => {
				const parsed = Number(value);
				if (Number.isNaN(parsed)) {
					throw new TypeError(`Invalid number: ${value}`);
				}
				return parsed;
			};

			expect(() => {
				typeFlag({
					number: StrictNumber,
				}, ['--number', 'not-a-number']);
			}).toThrow('Flag "--number": Invalid number: not-a-number');
		});

		test('Wrapped error preserves original via cause', () => {
			const original = new Error('original error');
			const ThrowingParser = (_value: string) => {
				throw original;
			};

			try {
				typeFlag({
					flag: ThrowingParser,
				}, ['--flag', 'value']);
			} catch (error) {
				expect(error).toBeInstanceOf(FlagParseError);
				expect(error).toBeInstanceOf(TypeError);
				expect((error as FlagParseError).flagName).toBe('flag');
				expect((error as TypeError).cause).toBe(original);
			}
		});
	});

	test('Default function throws error', () => {
		let thrown: unknown;
		try {
			typeFlag({
				flag: {
					type: String,
					default: () => {
						throw new Error('Default function error');
					},
				},
			}, []);
		} catch (error) {
			thrown = error;
		}

		// Default-factory failures are a developer/runtime bug, not flag-value
		// validation, so they propagate raw — never wrapped as a FlagParseError.
		expect(thrown).not.toBeInstanceOf(FlagParseError);
		expect((thrown as Error).message).toBe('Default function error');
	});
});
