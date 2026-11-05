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
2. **Definition:** throw for an alias of `=`, `.`, or `:`. The alias never matches, but the rest of the definition does: `{ name: { type: String, alias: '=' } }` with `--name x` gives `name: 'x'` in beta.20. Throwing surfaces the dead alias at startup, and it breaks callers that only use the long name. Recommendation: throw, because the v5 beta accepts breaking changes and a silently dead alias is a configuration error.
3. **Decision needed: names that start with `-`.** Two cases work today in beta.20, so rejecting either is breaking:
   - A multi-character name such as `-foo` cannot be typed as a long flag (`---foo` is not a flag), but works through an alias: `{ '-foo': { type: String, alias: 'f' } }` with `-f x` gives `'-foo': 'x'`, because [`createRegistry`](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/utils.ts#L172-L210) registers the key and the alias separately.
   - The single-character key `-` works inside a group, like alias `-` below: `{ '-': Boolean }` with `-a-` sets `'-': true` (and reports `a` as unknown).
4. **Decision needed: alias `-`.** It works today only inside a group (`-a-`), because `--` alone ends flag parsing. Rejecting it is a breaking change for that grouped use. Keeping it means the alias can never be used on its own.

Open evidence gap: the cost of a `u`-flag regex on the hot tokenizer path is unmeasured. Measure it with [`benchmarks/`](../../benchmarks) before choosing the pattern.

## Compatibility

- Tokens such as `--über` or `-é` change from positionals to flags.
- They also stop being values. Today a preceding value-taking flag consumes them: `typeFlag({ name: String, über: Boolean }, ['--name', '--über'])` gives `name: '--über'` in beta.20. With the new pattern, `--name` gets `""` and `--über` is parsed as a flag, defined or unknown.
- The `=`, `.`, and `:` aliases never match, but their definitions work through the long name, so throwing for them breaks those definitions. Rejecting names that start with `-`, or alias `-`, also breaks definitions that work today.

## Forwarding hazard: partially consumed groups

When type-flag consumes only part of a short-flag group, `spliceFromArgv` removes the consumed characters and keeps the rest ([argv-iterator.ts#L201-L220](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/argv-iterator.ts#L201-L220)). The kept token can mean something different on the next parse (observed with beta.20, `a` a defined boolean):

| Schema and call | argv after | Next parse sees |
| --- | --- | --- |
| alias `é`, `ignore` returns true for `é`, argv `['-aé']` | `['-é']` | a positional today; the flag `é` with the new tokenizer |
| alias `-`, `ignore` returns true for `-`, argv `['-a-']` | `['--']` | the end-of-flags delimiter |
| `getFlag('-a', Boolean, ['-aé'])` | `['-é']` | same as the first row |

This exists today and does not depend on the proposal, but the tokenizer change alters how the first and third rows read. Any fix should define how a kept remainder preserves its meaning, for example by keeping the group intact when its remainder would not start with a flag character.
