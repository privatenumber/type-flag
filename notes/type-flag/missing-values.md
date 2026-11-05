# Missing flag values

Researched 2026-11-05 against type-flag `v5.0.0-beta.20`.

## Decision: keep

When a value-taking flag has no value, type-flag gives `""` to the type function, and `NaN` for `Number`. The README lists this as an intentional trade-off. The [Optional Value Flags](../../README.md#optional-value-flags) pattern depends on it: a type function that receives `""` can return `true` for a bare `--string`.

Observed ([results](./argv-survey/results.md#missing-values)):

| Behavior | Parsers |
| --- | --- |
| Error | node `parseArgs`, commander, arg, argparse, clap |
| No error: `""`, `true`, or no value | yargs-parser, minimist, mri, type-flag |

Strict parsers throw, and permissive parsers fill a placeholder. type-flag sits with the permissive group but lets the type function decide, so a CLI can throw from its own type function for a required value.

## When to revisit

- type-flag adds a strict mode. A missing value would then be an error, as in `parseArgs()`, and the [dash-prefixed value](./dash-prefixed-values.md) guard could be reconsidered at the same time.
