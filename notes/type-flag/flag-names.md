# Flag names and aliases that cannot start a token

Researched 2026-11-05 against type-flag `v5.0.0-beta.20` and `4.5.2`. Not shipped.

## Summary

Recommendation: fix. type-flag accepts some flag names and aliases that its tokenizer cannot recognize at the start of a token. The tokens become positionals with no error. Every other surveyed parser matches `--über` and `-é`. Some of these aliases do match inside a short-flag group, so the fix must keep those cases working.

## Problem

The tokenizer only treats a token as a flag when an ASCII word character follows the dashes: `isFlagPattern = /^-{1,2}\w/` ([argv-iterator.ts#L28](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/argv-iterator.ts#L28)). After that check, it splits off a value at the first `=`, `:`, or `.`, and reads the remaining characters of a single-dash token one by one as aliases ([argv-iterator.ts#L172-L185](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/argv-iterator.ts#L172-L185)). `createRegistry` checks names for whitespace and `.:=`, and checks that aliases are one character, but it does not check either against the tokenizer ([`validateFlagName`](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/utils.ts#L127), [`createRegistry`](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/utils.ts#L163)).

Observed in both 4.5.2 and 5.0.0-beta.20 ([results](./argv-survey/results.md#type-flag-probes)):

| Definition | Input | Result |
| --- | --- | --- |
| `über: String` | `--über x` | `_: ['--über', 'x']` |
| alias `é` | `-é` | `_: ['-é']` |
| alias `=` | `-= x` | `_: ['-=', 'x']` |
| key `-x` | `---x` | `_: ['---x']` |

`--naïve` works only because its first character is ASCII.

Inside a group, after an ASCII first character, the result depends on the alias (observed with 5.0.0-beta.20, `a` a defined boolean):

| Alias | Input | Result |
| --- | --- | --- |
| `é` | `-aé` | both flags set |
| `-` | `-a-` | both flags set |
| `=`, `.`, `:` | `-a=`, `-a.`, `-a:` | only `a` set: the character is read as a value delimiter |

So `=`, `.`, and `:` aliases never match. `é` and `-` match only when another alias comes first.

Every other surveyed parser (parseArgs, commander, yargs-parser, minimist, mri, arg, argparse, clap) parses `--über x` and `-é` as flags ([results](./argv-survey/results.md#flag-names)).

## Specification

POSIX Guideline 3 limits option names to "a single alphanumeric character ... from the portable character set" ([XBD 12.2](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html#tag_12_02)). Long options are a GNU extension that POSIX does not cover. glibc's `getopt_long` scans the name up to `=` or the end of the argument and compares bytes with `strncmp` ([getopt.c#L205-L215](https://github.com/bminor/glibc/blob/glibc-2.42/posix/getopt.c#L205-L215)), so a UTF-8 name such as `über` works there. POSIX does not forbid `--über`, and implementations accept it.

## Proposed fix

1. **Tokenizer:** recognize a flag when a Unicode letter, digit, or `_` follows the dashes, for example `/^-{1,2}[\p{L}\p{N}_]/u`. This makes `--über` and `-é` work at the start of a token.
2. **Definition:** throw for definitions that no token can match: an alias of `=`, `.`, or `:`, and a name that starts with `-`.
3. **Decision needed: alias `-`.** It works today only inside a group (`-a-`), because `--` alone ends flag parsing. Rejecting it is a breaking change for that grouped use. Keeping it means the alias can never be used on its own.

Open evidence gap: the cost of a `u`-flag regex on the hot tokenizer path is unmeasured. Measure it with [`benchmarks/`](../../benchmarks) before choosing the pattern.

## Compatibility

- Tokens such as `--über` or `-é` change from positionals to flags.
- The new definition errors affect only definitions that no token can match, except alias `-` if it is rejected.
