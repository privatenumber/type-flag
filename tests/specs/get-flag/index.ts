import { testSuite } from 'manten';

export default testSuite(({ describe }) => {
	describe('get-flag', ({ runTestSuite }) => {
		runTestSuite(import('./types.js'));
		runTestSuite(import('./parsing.js'));
	});
});
