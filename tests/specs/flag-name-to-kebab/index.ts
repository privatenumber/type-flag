import { test, expect } from 'manten';
import { typeFlag } from '#type-flag';
import { flagNameToKebab } from '#type-flag/internal';

test('standard camelCase', () => {
	expect(flagNameToKebab('fooBar')).toBe('foo-bar');
});

test('trailing acronym', () => {
	expect(flagNameToKebab('orgID')).toBe('org-id');
	expect(flagNameToKebab('apiURL')).toBe('api-url');
});

test('middle acronym followed by capitalized word', () => {
	expect(flagNameToKebab('someAPIKey')).toBe('some-api-key');
});

test('middle acronym before capitalized word', () => {
	expect(flagNameToKebab('parseJSONData')).toBe('parse-json-data');
});

test('all-caps standalone', () => {
	expect(flagNameToKebab('ID')).toBe('id');
});

test('already lowercase', () => {
	expect(flagNameToKebab('id')).toBe('id');
});

test('single word', () => {
	expect(flagNameToKebab('simple')).toBe('simple');
});

test('parses acronym flag names from argv', () => {
	const parsed = typeFlag({
		orgID: String,
		apiURL: String,
	}, [
		'--org-id=acme',
		'--api-url=https://example.com',
	]);
	expect<string | undefined>(parsed.flags.orgID).toBe('acme');
	expect<string | undefined>(parsed.flags.apiURL).toBe('https://example.com');
});
