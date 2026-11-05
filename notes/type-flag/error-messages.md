# Naming the flag in parse errors

Researched 2026-11-05 against type-flag `v5.0.0-beta.20`. Not shipped.

## Summary

Recommendation: fix. `FlagParseError` always prefixes the name with `--`, so an alias error reads `Flag "--s"` and a single-character flag reads `Flag "--x"`. type-flag does not match `--x` to a single-character flag `x`; it parses `--x` as an unknown flag. `flagName` holds whatever name was typed, so the same flag reports `s` or `size` depending on input. `FlagParseError` is new in v5, so this has no stable-release compatibility cost.

## Current behavior

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

## Proposed fix

- `flagName` is always the schema key (`size`, `x`).
- The message names the flag by its definition: `--size` for a long flag, and `-x` for a single-character flag. Showing the alias too (`-s, --size`, like commander) is optional.
