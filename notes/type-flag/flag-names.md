# Flag names and aliases that can never match

Researched 2026-11-05 against type-flag `v5.0.0-beta.20` and `4.5.2`. Not shipped.

## Summary

Recommendation: fix. type-flag accepts some flag names and aliases at definition time that its tokenizer can never match, and the tokens become positionals with no error. Every other surveyed parser matches `--über` and `-é`.

## Problem

The tokenizer only recognizes a token as a flag when an ASCII word character follows the dashes: `isFlagPattern = /^-{1,2}\w/` ([argv-iterator.ts#L28](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/argv-iterator.ts#L28)). `createRegistry` checks names for whitespace and `.:=`, and checks that aliases are one character, but it never checks either against that pattern ([`validateFlagName`](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/utils.ts#L127), [`createRegistry`](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/utils.ts#L163)).

Observed in both 4.5.2 and 5.0.0-beta.20 ([results](./argv-survey/results.md#type-flag-probes)):

| Definition | Input | Result |
| --- | --- | --- |
| `über: String` | `--über x` | `_: ['--über', 'x']` |
| alias `é` | `-é` | `_: ['-é']` |
| alias `=` | `-= x` | `_: ['-=', 'x']` |
| key `-x` | `---x` | `_: ['---x']` |

`--naïve` works only because its first character is ASCII.

Every other surveyed parser (parseArgs, commander, yargs-parser, minimist, mri, arg, argparse, clap) parses `--über x` and `-é` as flags ([results](./argv-survey/results.md#flag-names)).

## Specification

POSIX Guideline 3 limits option names to "a single alphanumeric character ... from the portable character set" ([XBD 12.2](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html#tag_12_02)). Long options are a GNU extension that POSIX does not cover, and glibc's `getopt_long` compares long names with `strncmp` ([getopt.c#L213](https://github.com/bminor/glibc/blob/glibc-2.42/posix/getopt.c#L213)), so any bytes work. So POSIX does not forbid `--über`, and implementations accept it.

## Proposed fix

Use one character rule in both places:

1. **Tokenizer:** recognize a flag when a Unicode letter, digit, or `_` follows the dashes, for example `/^-{1,2}[\p{L}\p{N}_]/u`.
2. **Definition:** throw when a name or alias cannot be matched by that rule: an alias such as `-`, `=`, `.`, or `:`, or a name that starts with `-`.

Open evidence gap: the cost of a `u`-flag regex on the hot tokenizer path is unmeasured. Measure it with [`benchmarks/`](../../benchmarks) before choosing the pattern.

## Compatibility

Breaking only for tokens such as `--über` or `-é` that are positionals today. The validation errors only affect definitions that never worked.
