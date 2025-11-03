import { describe } from 'manten';

describe('type-flag', ({ runTestSuite }) => {
	runTestSuite(import('./specs/type-flag/index.js'));
	runTestSuite(import('./specs/get-flag/index.js'));
});
