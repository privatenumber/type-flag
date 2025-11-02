import { describe } from 'manten';

describe('type-flag', ({ runTestSuite }) => {
	runTestSuite(import('./specs/type-flag.js'));
	runTestSuite(import('./specs/get-flag.js'));
	runTestSuite(import('./specs/types.js'));
});
