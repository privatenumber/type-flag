# Naming the flag in parse errors

Researched 2026-11-05 against type-flag `v5.0.0-beta.20`. Fixed in v5 beta development; the [typeFlag tests](../../tests/specs/type-flag/error-handling.ts) and [getFlag tests](../../tests/specs/get-flag/parsing.ts) specify the behavior.

## Summary

`FlagParseError` names flags by their definition. In `v5.0.0-beta.20`, it instead prefixes the typed name with `--`, producing `--s` for an alias and `--x` for a single-character flag. Neither is a valid spelling for those definitions. `FlagParseError` is new in v5, so this has no stable-release compatibility cost.

## Previous behavior

Observed ([results](./argv-survey/results.md#type-flag-probes)):

| Input | `message` | `flagName` |
| --- | --- | --- |
| `--size bad` (alias `s`) | `Flag "--size": bad size` | `size` |
| `-s bad` | `Flag "--s": bad size` | `s` |
| `-x bad` (single-character flag `x`) | `Flag "--x": bad size` | `x` |

The JSDoc describes `flagName` as "The flag whose value failed to parse, without the `--` prefix (e.g. `sort`)" ([utils.ts#L89](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/utils.ts#L89)), and the README example shows `error.flagName // 'size'` for `--size huge` ([README.md#L456](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/README.md?plain=1#L456)). Neither covers an alias.

## Precedent

Of the surveyed parsers whose adapter runs the `size` validator, commander, argparse, and clap name the flag by its definition, not by the typed token. yargs-parser and arg print only the validator's message, `bad size`, with no flag name. minimist, mri, and node `parseArgs` have no type functions, so they do not run the validator ([results](./argv-survey/results.md#error-messages)):

| Parser | Message for `-s bad` |
| --- | --- |
| commander | `option '-s, --size <value>' argument 'bad' is invalid. bad size` |
| argparse | `argument -s/--size: bad size` |
| clap | `invalid value 'bad' for '--size <SIZE>': bad size` |
| yargs-parser, arg | `bad size` |

node `parseArgs` has no type functions, but its own option errors use the same definition form, such as `Option '-v, --verbose' does not take an argument` ([results](./argv-survey/results.md#boolean-values)).

## Decision

- For `typeFlag`, `flagName` is the schema key (`size`, `x`, `orgId`). The message uses the kebab-case long spelling (`--org-id`) or the short spelling for a single-character key (`-x`), regardless of input. See the [typeFlag tests](../../tests/specs/type-flag/error-handling.ts).
- For `getFlag`, `flagName` is the first long search name, or the first short search name if no long name exists, without dashes. The message uses that exact search spelling with dashes. See the [getFlag tests](../../tests/specs/get-flag/parsing.ts).
