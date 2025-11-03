import { testSuite } from 'manten';

export default testSuite(({ describe }) => {
	describe('type-flag', ({ runTestSuite }) => {
		runTestSuite(import('./error-handling.js'));
		runTestSuite(import('./types.js'));
		runTestSuite(import('./parsing.js'));
	});
});
