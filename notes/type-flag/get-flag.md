# `getFlag` consistency with `typeFlag`

Researched 2026-11-05 against type-flag `v5.0.0-beta.20` and `4.5.2`. Not shipped.

## Summary

`getFlag` disagrees with `typeFlag` in three ways. Two are bugs to fix. The third, which occurrence wins, needs a decision.

Observed in both versions ([results](./argv-survey/results.md#type-flag-probes)):

| Call | Result | `typeFlag` equivalent |
| --- | --- | --- |
| `getFlag('-h', Boolean, ['--h'])` | `true` | `--h` is invalid for a single-character name (README "Single-character Flag Names") |
| `getFlag('--a, -b', Boolean, ['-b'])` | `undefined`, `-b` left in argv | n/a |
| `getFlag('a', String, ['--a', 'x'])` | `undefined` | n/a: `a` is a valid `typeFlag` schema key; `getFlag` takes dashed CLI spellings |
| `getFlag('--a', String, ['--a', 'x', '--a', 'y'])` | `"x"`, `--a y` left in argv | `typeFlag` gives `"y"` |

## Bugs

- **`--h` matches `-h`.** `getFlag` stores names without their dashes, so `-h` and `--h` become the same key. Fix: keep the dash form when matching, so `--h` in argv does not match a one-character search name. `typeFlag` parses `--h` as an unknown flag in that case.
- **Invalid names are ignored silently.** `parseFlagArgv` returns `undefined` for `a` and ` -b`, and that `undefined` goes into the name set. These are invalid search expressions, not unknown argv flags. Fix: trim each name and throw for a search expression that does not parse.

## Decision needed: first or last occurrence

`typeFlag` uses the last value for a scalar flag. Most surveyed parsers do the same: parseArgs, commander, arg, argparse ([results](./argv-survey/results.md#repeated-flags)). clap errors by default, and yargs-parser, minimist, and mri collect an array.

`getFlag` returns the first value and leaves later occurrences in argv for the next parser. Options:

1. **Last wins, consume all occurrences.** Matches `typeFlag` and the majority.
2. **Keep first wins.** This lets callers take one occurrence at a time. No caller found in a GitHub code search for `from 'type-flag'` (2026-11-05) depends on it, but the search only covers indexed public repositories.
