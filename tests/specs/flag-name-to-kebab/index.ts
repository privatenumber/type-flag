import { test, expect } from 'manten';
import { typeFlag } from '#type-flag';
import { flagNameToKebab } from '#type-flag/internal';

test('combining marks stay attached at lowercase boundaries', () => {
	for (const [name, expected] of [['éFlag', 'é-flag'], ['aÉclair', 'a-éclair']]) {
		for (const form of ['NFC', 'NFD'] as const) {
			expect(flagNameToKebab(name.normalize(form)).normalize('NFC')).toBe(expected);
		}
	}
});

test('combining marks stay attached at acronym boundaries', () => {
	for (const name of ['ÉCOLEName', 'ABÉclair']) {
		const expected = name === 'ÉCOLEName' ? 'école-name' : 'ab-éclair';
		for (const form of ['NFC', 'NFD'] as const) {
			expect(flagNameToKebab(name.normalize(form)).normalize('NFC')).toBe(expected);
		}
	}
});

test('titlecase letters form uppercase boundaries', () => {
	expect(flagNameToKebab('aǅuro')).toBe('a-ǆuro');
	expect(flagNameToKebab('Aǅuro')).toBe('a-ǆuro');
});

test('Unicode kebab spelling collides with an equivalent schema key', () => {
	expect(() => typeFlag({
		aÉ: Boolean,
		'a-é': Boolean,
	}, [])).toThrow('Duplicate flags named "a-é"');
});

test('Unicode case and number boundaries', () => {
	expect(flagNameToKebab('üFlag')).toBe('ü-flag');
	expect(flagNameToKebab('aÉclair')).toBe('a-éclair');
	expect(flagNameToKebab('a٥Flag')).toBe('a٥-flag');
	// Lowercase property letters outside the Ll category, such as modifier letters
	expect(flagNameToKebab('aᵃFlag')).toBe('aᵃ-flag');
	expect(flagNameToKebab('aÉÖKey')).toBe('a-éö-key');
	expect(typeFlag({ üFlag: Boolean }, ['--ü-flag']).flags.üFlag).toBe(true);
});

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

test('digit before uppercase', () => {
	expect(flagNameToKebab('oauth2Bearer')).toBe('oauth2-bearer');
});

test('acronym followed by digit then uppercase', () => {
	expect(flagNameToKebab('openAPI3Key')).toBe('open-api3-key');
});

test('parses digit-boundary flag names from argv', () => {
	const parsed = typeFlag({
		oauth2Bearer: String,
	}, [
		'--oauth2-bearer=X',
	]);
	expect<string | undefined>(parsed.flags.oauth2Bearer).toBe('X');
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
