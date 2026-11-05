# Dash-prefixed flag values

Last verified 2026-11-04 against type-flag [`v5.0.0-beta.19`](https://github.com/privatenumber/type-flag/tree/v5.0.0-beta.19).

## Summary

No specification says that a value after a value-taking flag must not start with `-`. POSIX says the opposite: a required option-argument is the next argument, whatever it contains. A guard against dash-prefixed values is a library convention that catches typos such as `--port --verbose`.

Parsers fall into four groups:

1. **Greedy:** the flag always takes the next token. POSIX `getopt`, glibc, Go `flag`, pflag (cobra), Python `optparse`, and commander follow this rule.
2. **Greedy, but with an error for dash values:** Node.js `util.parseArgs()` in strict mode (its default) and `arg` throw instead of guessing.
3. **Guarded, with a numeric exception:** the flag rejects a dash-prefixed token unless the token looks numeric. argparse, yargs-parser, clap (opt-in), and type-flag follow this rule.
4. **Guarded, with no exception:** minimist and mri never take a dash-prefixed token as a value.

type-flag is in group 3. Up to `v5.0.0-beta.19`, its numeric exception accepted only complete numbers (`-5`, `-5.5`, `-5e3`). [#91](https://github.com/privatenumber/type-flag/issues/91) widened it to any token that starts with `-` and a digit. Python's argparse made the same change in 3.14: it moved from a complete-number match to a prefix match on `-\.?\d`, so values like `-12,3` and `-0xabc` reach custom converters. See [Decision](#decision).

## The question

A value-taking flag is followed by a token that starts with `-`. Is the token the flag's value, or a new flag?

```sh
cli --range -5..10   # value "-5..10", or flag "-5" with inline value ".10"?
cli --range --verbose   # value "--verbose", or a forgotten value followed by the --verbose flag?
```

The shell removes quotes before the program runs, so `cli --range "-5..10"` gives the parser the same argv. Only the parser can decide.

## Specifications

### POSIX: a required option-argument is the next argument

- [XBD 12.2 Utility Syntax Guidelines](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html#tag_12_02), Guideline 7: "Option-arguments should not be optional."
- The [XBD rationale](https://pubs.opengroup.org/onlinepubs/9799919799/xrat/V4_xbd_chap01.html) for Guideline 7: "Guideline 7 allows any string to be an option-argument; an option-argument can begin with any character, can be - or --, and can be an empty string. For example, the commands pr -h -, pr -h --, pr -h -d, pr -h +2, and pr -h " contain the option-arguments -, --, -d, +2, and an empty string, respectively."
- [`getopt()`](https://pubs.opengroup.org/onlinepubs/9799919799/functions/getopt.html): when the option character is the last character of its argv element, "optarg shall contain the next element of argv". The function does not inspect that element.
- Guideline 3 makes digit options legal: "Each option name should be a single alphanumeric character". That is why every parser with a numeric exception must also handle defined digit flags such as `-1`.

GNU follows the same rule. glibc's `getopt` assigns the next element without a check: [`d->optarg = argv[d->optind++];`](https://github.com/bminor/glibc/blob/glibc-2.42/posix/getopt.c#L355).

### No specification covers the guarded model

The guarded model has no specification. It comes from zero-config parsers like minimist, which do not know whether a flag takes a value. [clig.dev](https://clig.dev) has no guidance on dash-prefixed values (searched 2026-11-04).

## Parser survey

### Source behavior

| Parser | Version | Rule for a dash-prefixed token after a value-taking flag | Source |
| --- | --- | --- | --- |
| glibc `getopt` | 2.42 | Always the value | [getopt.c#L355](https://github.com/bminor/glibc/blob/glibc-2.42/posix/getopt.c#L355) |
| Go `flag` | 1.25.0 | Always the value | [flag.go#L1131](https://github.com/golang/go/blob/go1.25.0/src/flag/flag.go#L1131) |
| pflag (cobra) | 1.0.10 | Always the value | [flag.go#L1021](https://github.com/spf13/pflag/blob/v1.0.10/flag.go#L1021) |
| Python `optparse` | 3.14.0 | Always the value | [optparse.py#L1480](https://github.com/python/cpython/blob/v3.14.0/Lib/optparse.py#L1480) |
| commander | 14.0.3 | Always the value for a required option-argument. The [README](https://github.com/tj/commander.js/blob/v14.0.3/Readme.md?plain=1#L249) says: "Options with an expected option-argument are greedy and will consume the following argument whatever the value." | [command.js#L1796](https://github.com/tj/commander.js/blob/v14.0.3/lib/command.js#L1796) |
| picocli | 4.7.7 | The value, unless the token is a defined option or starts with a defined short option | [CommandLine.java#L14784](https://github.com/remkop/picocli/blob/v4.7.7/src/main/java/picocli/CommandLine.java#L14784), [#L14801](https://github.com/remkop/picocli/blob/v4.7.7/src/main/java/picocli/CommandLine.java#L14801) |
| Node.js `util.parseArgs()` | 24.13.1 | Takes the token ([`return true; // greedy!`](https://github.com/nodejs/node/blob/v24.13.1/lib/internal/util/parse_args/utils.js#L57)), but strict mode throws for any value that starts with `-` and is longer than one character | [utils.js#L66](https://github.com/nodejs/node/blob/v24.13.1/lib/internal/util/parse_args/utils.js#L66), [parse_args.js#L73](https://github.com/nodejs/node/blob/v24.13.1/lib/internal/util/parse_args/parse_args.js#L73) |
| `arg` | 5.0.2 | Throws, except for a complete number when the type is `Number` or `BigInt` | [index.js#L156](https://github.com/vercel/arg/blob/5.0.2/index.js#L156) |
| argparse | 3.14.0 | Rejects a dash-prefixed token, except a token that starts with `-\.?\d`. The exception is off for the whole parser when any option looks like a negative number. | [argparse.py#L1464](https://github.com/python/cpython/blob/v3.14.0/Lib/argparse.py#L1464), [#L2461](https://github.com/python/cpython/blob/v3.14.0/Lib/argparse.py#L2461), [docs](https://github.com/python/cpython/blob/v3.14.0/Doc/library/argparse.rst?plain=1#L1525) |
| yargs-parser | 22.0.0 | Rejects, except a complete number: `/^-([0-9]+(\.[0-9]+)?\|\.[0-9]+)$/` | [yargs-parser.ts#L111](https://github.com/yargs/yargs-parser/blob/yargs-parser-v22.0.0/lib/yargs-parser.ts#L111), [#L278](https://github.com/yargs/yargs-parser/blob/yargs-parser-v22.0.0/lib/yargs-parser.ts#L278) |
| clap | 4.5.40 | Rejects by default. Per-argument opt-ins: `allow_negative_numbers` accepts complete numbers, and `allow_hyphen_values` accepts anything | [arg.rs#L1541](https://github.com/clap-rs/clap/blob/v4.5.40/clap_builder/src/builder/arg.rs#L1541), [#L1575](https://github.com/clap-rs/clap/blob/v4.5.40/clap_builder/src/builder/arg.rs#L1575), [`is_number`](https://github.com/clap-rs/clap/blob/clap_lex-v0.7.5/clap_lex/src/lib.rs#L492) |
| minimist | 1.2.8 | Rejects, with no numeric exception | [index.js#L167](https://github.com/minimistjs/minimist/blob/v1.2.8/index.js#L167) |
| mri | 1.2.0 | Rejects, with no numeric exception | [index.js#L90](https://github.com/lukeed/mri/blob/v1.2.0/src/index.js#L90) |
| type-flag | 5.0.0-beta.19 | Rejects, except a complete number whose characters are not all defined flags | [argv-iterator.ts#L30](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.19/src/argv-iterator.ts#L30), [#L49-L67](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.19/src/argv-iterator.ts#L49-L67) |

picocli's `unmatchedOptionsAllowedAsOptionParameters` setting defaults to `true` ([CommandLine.java#L8565](https://github.com/remkop/picocli/blob/v4.7.7/src/main/java/picocli/CommandLine.java#L8565)). So by default picocli accepts `-z` as a value unless `-z` is defined. Setting it to `false` rejects values that only resemble options.

### Observed behavior

Each parser was configured with a string `--range` flag and a boolean `--verbose` flag. The scripts are in [dash-prefixed-values/](./dash-prefixed-values/). Environment: macOS, Node.js v24.13.1, Python 3.14.7 and 3.13.15.

| Parser | `-5` | `-5..10` | `-5%` | `-.5x` | `--verbose` |
| --- | --- | --- | --- | --- | --- |
| commander 14.0.3 | value | value | value | value | value |
| `parseArgs()` `strict: false` | value | value | value | value | value |
| `parseArgs()` strict | throws | throws | throws | throws | throws |
| `arg` 5.0.2 (`String`) | throws | throws | throws | throws | throws |
| argparse 3.14.7 | value | value | value | value | error |
| argparse 3.14.7, `-5` option defined | error | error | error | error | error |
| argparse 3.13.15 | value | error | error | error | error |
| yargs-parser 22.0.0 | value | flags | flags | flags | flag |
| minimist 1.2.8 | flags | flags | flags | flags | flag |
| mri 1.2.0 | flags | flags | flags | flags | flag |
| type-flag 5.0.0-beta.19 | value | flags | flags | value | flag |

"value" means `--range` received the token. "flags" means the token was parsed as flags, and `--range` received `""`. For example, type-flag returns `range: ""` and `unknownFlags: { 5: ['.10'] }` for `-5..10`.

type-flag already accepts `-.5x` because its flag pattern, [`/^-{1,2}\w/`](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.19/src/argv-iterator.ts#L28), does not match `-.`, so the token is never a flag candidate.

## Precedent: argparse moved from a complete number to a prefix

argparse made the change that #91 proposes:

- Python 3.13 and earlier used a complete-number match, `^-\d+$|^-\d*\.\d+$` ([3.13.0 argparse.py#L1390](https://github.com/python/cpython/blob/v3.13.0/Lib/argparse.py#L1390)).
- In [python/cpython#123945](https://github.com/python/cpython/issues/123945#issuecomment-2369150191), argparse maintainer Serhiy Storchaka wrote: "I wonder whether we should make the check even more lenient, for example `-\.?\d`. This would help the user to support all numbers mentioned above (`-1e3`, `-1j`, `-12,3` and also hexadecimals `-0xabc`, etc) if they use custom converter."
- [python/cpython#124823](https://github.com/python/cpython/pull/124823) (commit [`0c5a48c`](https://github.com/python/cpython/commit/0c5a48c1c9039eb1ce25a96c43505c4de0a0b9d7), issue [#124693](https://github.com/python/cpython/issues/124693)) changed the matcher to `-\.?\d`. `re.match` anchors only the start, so this is a prefix test. The 3.14 line has it, and 3.13.15 does not (see the observed table).

No later CPython issue reports a regression from this change. A search on 2026-11-04 for `argparse negative` issues created after 2024-10-09 found none.

## Design discussion: guard or greedy

[pkgjs/parseargs#77](https://github.com/pkgjs/parseargs/issues/77) is the design discussion behind Node.js `parseArgs()`. Both sides accepted the POSIX rule. The disagreement was about typos: `--with --verbose` may mean "the value is `--verbose`" or "I forgot the value". Node.js chose greedy parsing plus a strict-mode error that suggests the `=` form ([comment](https://github.com/pkgjs/parseargs/issues/77#issuecomment-1086725150)).

Commander kept greedy required option-arguments. In v14 it added a negative-number exception for optional option-arguments and operands ([tj/commander.js#2338](https://github.com/tj/commander.js/issues/2338#issuecomment-2888810445)).

## Decision

type-flag accepts a token as a flag's value when the flag expects a value, the token matches `/^-\d/`, and not every character after the dash is a defined flag ([#91](https://github.com/privatenumber/type-flag/issues/91), `isDashDigitValue` in [`src/argv-iterator.ts`](../../src/argv-iterator.ts)). The tests are in the "values starting with a negative number" suite of [`tests/specs/type-flag/parsing.ts`](../../tests/specs/type-flag/parsing.ts) and in [`tests/specs/get-flag/parsing.ts`](../../tests/specs/get-flag/parsing.ts).

Rationale:

- **type-flag keeps a guard instead of becoming greedy.** type-flag gives a missing string value `""` instead of throwing (README "trade-offs"). If it were greedy, `--range --verbose` would silently set `range` to `"--verbose"` and drop the flag. The guard keeps that typo visible.
- **A digit prefix keeps the guard's purpose.** Letters are unaffected, so `--range --verbose` and `--range -v` still parse as flags. argparse 3.14 uses the same kind of prefix rule.
- **type-flag's defined-flag check is finer than argparse's.** argparse turns the numeric exception off for the whole parser when any option looks like a negative number (observed: with `-5` defined, even `-5..10` is an error). type-flag checks each token: the token is a flag group only when every character after the dash is a defined flag. So `-5..10` stays a value even when `-5` is defined, because `.` can never be a flag name, while `-5h` is a flag group when both `5` and `h` are defined.
- **The rule needs only `\d`, not `[\d.]`.** `-.5` already fails the flag pattern `/^-{1,2}\w/`, so it was a value before this change.

Known trade-off: with a digit alias `-5` defined, `--range -5=3` changed from "alias `5` with inline value `3`" to "`range` is `-5=3`". This needs a digit alias, the inline-value form, and the value slot at the same time. Because `v5.0.0-beta.19` is a published release, the change shipped with a `BREAKING CHANGE:` footer on the beta channel.

## Open proposal: standalone dash-digit tokens as positionals

Researched 2026-11-05. Not shipped.

Outside the value slot, type-flag parses `-5` as the unknown flag `5`: `calc -5` gives `unknownFlags: { 5: [true] }`, and `file -5..10` gives `unknownFlags: { 5: ['.10'] }` ([results](./argv-survey/results.md#standalone-dash-digit)).

Parsers split three ways:

| Behavior | Parsers |
| --- | --- |
| Positional | argparse 3.14 (any `-\.?\d` prefix), commander 14.0.3 (complete numbers in a leaf command only, so `-5..10` is an unknown option), yargs-parser 22.0.0 (complete numbers, coerced to numbers) |
| Error | node `parseArgs` (strict), arg, clap (positionals need `allow_negative_numbers`) |
| Unknown flag | minimist, mri, type-flag |

Sources:

- argparse: "positional arguments may only begin with `-` if they look like negative numbers and there are no options in the parser that look like negative numbers" ([argparse.rst#L1525](https://github.com/python/cpython/blob/v3.14.0/Doc/library/argparse.rst?plain=1#L1525)).
- commander added this in v14 ([CHANGELOG.md#L50](https://github.com/tj/commander.js/blob/v14.0.3/CHANGELOG.md?plain=1#L50), [tj/commander.js#2338](https://github.com/tj/commander.js/issues/2338)). The check is [command.js#L1852-L1858](https://github.com/tj/commander.js/blob/v14.0.3/lib/command.js#L1852-L1858): "A negative number in a leaf command is not an unknown option." It applies only when the command has no subcommands (`this.commands.length === 0`). The survey uses a leaf command.

Assessment: supported, with moderate demand. A CLI that takes numbers as positionals (`calc -5`, `seek -10`) cannot accept them today without `--`. The per-token rule from the [Decision](#decision) above would apply unchanged: the token is flags only when every character after the dash is a defined flag. The cost is that a wrapper that reports "unknown flag `-5`" would see a positional instead. A CLI framework that treats the first positional as a command name, such as cleye, would also see `-5` as a command name.

## Kept: `--` right after a value-taking flag ends parsing

Researched 2026-11-05.

`--name -- x` gives `name: ""` and `_: ['x']` in type-flag ([results](./argv-survey/results.md#value-slot-double-dash)). POSIX disagrees: the Guideline 7 rationale lists `pr -h --` as an option-argument of `--`. Parsers split:

- **`--` is the value:** commander.
- **Error:** node `parseArgs` in strict mode (its default), arg, argparse, clap. With `strict: false`, node `parseArgs` takes `--` as the value (`name: "--"`, positional `x`; Node.js v24.13.1).
- **`--` ends parsing:** yargs-parser, minimist, mri, type-flag. An open yargs-parser issue reports the opposite behavior, in short flags, as a bug ([yargs/yargs-parser#566](https://github.com/yargs/yargs-parser/issues/566), "Bare `--` is consumed as the value of a preceding short option").

Decision: keep. Consuming `--` as a value would contradict the guard that type-flag uses for every other dash-prefixed token. Among the parsers that do not throw, only commander and non-strict `parseArgs` consume it, and both are greedy for every dash-prefixed value, which type-flag deliberately is not.

## Reproduce

```sh
mkdir /tmp/argv-deps && cd /tmp/argv-deps
printf '{"private":true}' > package.json
pnpm add commander@14.0.3 yargs-parser@22.0.0 minimist@1.2.8 mri@1.2.0 arg@5.0.2 type-flag@5.0.0-beta.19
node <repo>/notes/type-flag/dash-prefixed-values/matrix.mjs /tmp/argv-deps
python3.14 -I <repo>/notes/type-flag/dash-prefixed-values/argparse_matrix.py
uv run --no-project --python 3.13 python -I <repo>/notes/type-flag/dash-prefixed-values/argparse_matrix.py
```

## When to revisit

- argparse or another major parser reverts its prefix rule. Read the reason, because it may also apply to type-flag.
- Users report conflicts between digit aliases and dash-prefixed values.
- type-flag adds a strict mode that throws for a missing value. Greedy parsing plus an error, as in `parseArgs()`, then becomes a real alternative.
