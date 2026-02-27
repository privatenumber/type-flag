import { describe } from 'manten';

describe('type-flag', async () => {
	await import('./error-handling.js');
	await import('./types.js');
	await import('./parsing.js');
});
