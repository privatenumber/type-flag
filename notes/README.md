# Engineering research notes

Tracked maintainer references for the conventions and decisions that shape type-flag. These notes are not published to npm: `package.json#files` lists only `dist` and `skills`.

## Ownership

The [type-flag/](./type-flag/README.md) folder owns project policy and cross-tool comparisons. It cites upstream specifications and parsers inline, at pinned releases.

## Index

| Folder | Owns |
| --- | --- |
| [type-flag/](./type-flag/README.md) | Parsing policy, comparisons with other argv parsers, and the evidence behind them |

## Evidence

Cite upstream facts beside the claim using primary sources, preferably pinned releases or commits. Ground project behavior in repository source or tests, and label decisions with their rationale. Distinguish documented and observed behavior from inference. Keep executable contracts in the test suite.

## Maintenance

When upstream evidence changes, update the notes and identify affected project decisions and tests.
