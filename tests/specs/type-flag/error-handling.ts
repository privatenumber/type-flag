import { testSuite, expect } from 'manten';
import { typeFlag } from '#type-flag';

export default testSuite(({ describe }) => {
	describe('Error handling', ({ describe, test }) => {
		describe('Invalid flag name', ({ test }) => {
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

		describe('Invalid alias', ({ test }) => {
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

		describe('Custom type errors', ({ test }) => {
			test('Custom parser throws error', () => {
				const ThrowingParser = (_value: string) => {
					throw new Error('Custom parse error');
				};

				expect(() => {
					typeFlag({
						custom: ThrowingParser,
					}, ['--custom', 'value']);
				}).toThrow('Custom parse error');
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
				}).toThrow('Invalid number: not-a-number');
			});
		});

		test('Default function throws error', () => {
			expect(() => {
				typeFlag({
					flag: {
						type: String,
						default: () => {
							throw new Error('Default function error');
						},
					},
				}, []);
			}).toThrow('Default function error');
		});
	});
});
