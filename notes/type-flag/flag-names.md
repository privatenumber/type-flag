# Flag names and aliases that cannot start a token

Researched 2026-11-05 against type-flag `v5.0.0-beta.20` and `4.5.2`. Fixed in the v5 beta.

## Summary

The old registry accepted definitions that could not start a token. The fix recognizes Unicode letters and numbers and rejects definitions that cannot start a token. Every other surveyed parser matches `--über` and `-é`. The grouped Unicode alias case remains supported.

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

## Decision and implementation

The tokenizer uses `/^-{1,2}[\p{L}\p{N}_]/u`. One shared character class also drives schema, alias, and `getFlag` search-name validation. Schema keys must start with that class and cannot contain whitespace or `=:.`. Aliases must be exactly one UTF-16 code unit in the class. Digits remain valid. `getFlag` requires a short name to be one UTF-16 code unit in that class, or a long name to start with the class, contain no reserved characters, and span at least two UTF-16 code units. Short groups are read as code points and their positions are UTF-16 offsets.

This intentionally rejects `-foo`, `-`, and punctuation starts and aliases, even where they previously worked through a different alias or within a group. The v5 beta permits this break to avoid definitions that cannot start a token. See the [definition and error-spelling tests](../../tests/specs/type-flag/error-handling.ts), [typeFlag parsing tests](../../tests/specs/type-flag/parsing.ts), and [getFlag tests](../../tests/specs/get-flag/parsing.ts).

| Case | Old | New |
| --- | --- | --- |
| `--über x`, `-é` | positional | flags |
| `--name --über` | `name` receives `--über` | `name` receives `""`; `--über` is a flag |
| key `-foo`, alias `-` or `=` | accepted, but not usable at token start | rejected at definition time |
| alias `5` | valid | valid |
| key `aÉclair` | matches `--aéclair` | matches `--a-éclair` |
| keys `aÉ` and `a-é` | accepted | duplicate-flag error |

camelCase splitting uses the Unicode `Lowercase` and `Uppercase` properties plus titlecase (`Lt`), and keeps combining marks with the preceding letter. The mark lookbehinds rescan a run of combining marks, so a schema key with thousands of consecutive marks takes seconds to register (about 2 s for 8,000 marks on Node 22). This runs once per definition on developer-supplied schema keys, not on argv, so it was accepted instead of adding a length limit.

### Benchmark

Built with `pnpm build`, then ran `node bench.js` in [`benchmarks/`](../../benchmarks) once before and once after. On Apple M2 Max, Node 24.13.1 arm64-darwin, average `type-flag` was 2.32 µs before and 2.27 µs after; `get-flag` was 1.45 µs before and 1.41 µs after. This ASCII-only full-API benchmark includes registry and search validation, and single runs do not isolate regex cost or establish statistical equivalence.

## Compatibility

- Tokens such as `--über` or `-é` change from positionals to flags.
- They also stop being values. In beta.20 a preceding value-taking flag consumes them: `typeFlag({ name: String, über: Boolean }, ['--name', '--über'])` gives `name: '--über'`. With the new pattern, `--name` gets `""` and `--über` is parsed as a flag, defined or unknown.
- The `=`, `.`, and `:` aliases never match, but their definitions work through the long name, so throwing for them breaks those definitions. Rejecting names that start with `-`, or alias `-`, also breaks definitions that work today.
- CamelCase keys with non-ASCII case boundaries now use the same kebab-case splitting as ASCII keys: `aÉclair` matched `--aéclair` before and now matches `--a-éclair`, like `aEclair`. Schemas such as `{ aÉ: Boolean, 'a-é': Boolean }` now throw a duplicate-flag error because both keys map to `a-é`.

## Forwarding hazard: partially consumed groups

When a parser consumes part of a short group, the remainder can become a delimiter, long flag, dash-number value, or positional. The decision is to preserve a usable short-group start where possible. After removing consumed characters as whole code points, keep the attached `=`, `:`, or `.` value only if the original last group character remains:

1. Remove an empty remainder.
2. Keep a remainder starting with a Unicode letter or `_` unchanged.
3. Otherwise move its first letter or `_` to the front, unless it is the last character and has an attached value. Moving that character would give its value to a different flag.
4. If no character can move, remove a remainder consisting only of `-` characters. Keep any other remainder unchanged. It can still be a dash-number value candidate or a positional.

For example, extracting `-q` changes `-q-abc` to `-a-bc` and `-q5x` to `-x5`; `-q-` is removed, while `-q?` becomes the positional `-?`. The attached-value exception leaves `-q?a=x` as `-?a=x`.

Rejected alternatives: appending `=` guesses the next parser's schema and an empty value throws for strict booleans; keeping the whole group parses consumed flags twice; splitting the group into tokens still leaves the value-capture problem.

The next parser's schema can still change value capture. Extracting `-b` from `['-ab', 'file']` leaves `['-a', 'file']`; if the next parser defines `a: String`, it consumes `file`. Moving the last character to the front when it has no attached value can similarly change which flag takes the next token. Avoid grouping extracted flags with forwarded flags, or attach values with `=`.

The removal pass compacts the same argv array in token order rather than splicing once per removal. On Node v24.13.1, with 32,000 matched flags and 32,000 kept arguments, four measured runs after one warmup gave 399.2-420.1 ms before and 9.1-13.8 ms after for interleaved `-v`; with `--quiet` tokens followed by kept arguments, results were 155.5-790.2 ms before and 3.9-12.0 ms after. Each run called `getFlag` with a fresh copy and verified that all kept arguments remained. The wide before range reflects runtime variation; these are elapsed measurements, not a statistical guarantee.
