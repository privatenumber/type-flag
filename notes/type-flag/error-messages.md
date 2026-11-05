# Naming the flag in parse errors

Researched 2026-11-05 against type-flag `v5.0.0-beta.20`. Not shipped.

## Summary

Recommendation: fix. `FlagParseError` always prefixes the name with `--`, so an alias error reads `Flag "--s"` and a single-character flag reads `Flag "--x"`, a form type-flag itself rejects. `flagName` holds whatever name was typed, so the same flag reports `s` or `size` depending on input. `FlagParseError` is new in v5, so this has no stable-release compatibility cost.

## Current behavior

Observed ([results](./argv-survey/results.md#type-flag-probes)):

| Input | `message` | `flagName` |
| --- | --- | --- |
| `--size bad` (alias `s`) | `Flag "--size": bad size` | `size` |
| `-s bad` | `Flag "--s": bad size` | `s` |
| `-x bad` (single-character flag `x`) | `Flag "--x": bad size` | `x` |

The README describes `flagName` as "The flag whose value failed to parse, without the `--` prefix (e.g. `sort`)", which reads as the schema key.

## Precedent

No surveyed parser prints a dash form the user cannot type. All of them name the flag by its definition, not by the typed token ([results](./argv-survey/results.md#error-messages)):

| Parser | Message for `-s bad` |
| --- | --- |
| commander | `option '-s, --size <value>' argument 'bad' is invalid. bad size` |
| argparse | `argument -s/--size: bad size` |
| clap | `invalid value 'bad' for '--size <SIZE>': bad size` |
| node `parseArgs` | no type parsing, but its other errors use the same `'-v, --verbose'` form |

## Proposed fix

- `flagName` is always the schema key (`size`, `x`).
- The message names the flag by its definition: `--size` for a long flag, and `-x` for a single-character flag. Showing the alias too (`-s, --size`, like commander) is optional.
