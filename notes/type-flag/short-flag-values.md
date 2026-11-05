# Short flag values: `-nfoo` and `-vnfoo`

Researched 2026-11-05 against type-flag `v5.0.0-beta.20`. Not shipped.

## Summary

Recommendation: support attached short values. When a short flag that takes a value appears in a group, the rest of the token is its value. POSIX requires conforming standard utilities to accept this form. In the survey, node `parseArgs`, commander, argparse, and clap accept `-nfoo` and `-c5`. yargs-parser and minimist read `-c5` as a value for `count` but parse `-nfoo` as more flags. arg throws, and mri and type-flag parse the rest of both as more flags. Adapter configurations differ; see the caveat below.

type-flag's README lists "does not parse POSIX-style short string values like `-ovalue`" as an intentional trade-off. That line came from a docs comparison with `parseArgs()` ([`e0715a9`](https://github.com/privatenumber/type-flag/commit/e0715a9720376c2ad303e7f008c5bc97ddd286e4)), not from a recorded design decision.

## Current behavior

Schema: `name` is a string with alias `n`, `verbose` is a boolean with alias `v`, and `count` is a number with alias `c` ([results](./argv-survey/results.md#short-flag-values)). Not every adapter can declare a number: node `parseArgs` declares `count` as a string (so it reports `"5"`), and the minimist and mri adapters declare no type for it ([adapter differences](./argv-survey/README.md#adapter-differences)).

| Input | type-flag | getopt rule (parseArgs, commander, argparse, clap) |
| --- | --- | --- |
| `-nfoo` | `name: ""`, unknown flags `f` and `o` | `name: "foo"` |
| `-c5` | `count: NaN`, unknown flag `5` | `count: 5` |
| `-vnfoo` | `name: ""`, `verbose: true`, unknown `f`, `o` | `name: "foo"`, `verbose: true` |
| `-nv foo` | `name: ""`, `verbose: true`, `_: ['foo']` | `name: "v"`, `_: ['foo']` |
| `-n=foo` | `name: "foo"` | argparse, clap: `"foo"`. parseArgs, commander: `"=foo"` |

The current behavior loses data silently. `-c5` reads as "count 5" to a user but yields `NaN`, and the type function never sees `5`.

## Specification

- [XBD 12.2](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html#tag_12_02), Guideline 5: "One or more options without option-arguments, followed by at most one option that takes an option-argument, should be accepted when grouped behind one '-' delimiter."
- [XBD 12.1](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html#tag_12_01), item 2: "a conforming implementation shall also permit applications to specify the option and option-argument in the same argument string without intervening <blank> characters."

## Implementations

- glibc `getopt` takes the rest of the element as the argument: [getopt.c#L674-L679](https://github.com/bminor/glibc/blob/glibc-2.42/posix/getopt.c#L674-L679) ("If we end this ARGV-element by taking the rest as an arg, we must advance to the next element now.").
- node `parseArgs`: [`isShortOptionGroup`](https://github.com/nodejs/node/blob/v24.13.1/lib/internal/util/parse_args/utils.js#L140) and [`isShortOptionAndValue`](https://github.com/nodejs/node/blob/v24.13.1/lib/internal/util/parse_args/utils.js#L162).
- commander: [command.js#L1820](https://github.com/tj/commander.js/blob/v14.0.3/lib/command.js#L1820).
- argparse and clap: observed in the survey.
- yargs-parser has a narrower rule: a letter followed by a number is a value ([yargs-parser.ts#L961](https://github.com/yargs/yargs-parser/blob/yargs-parser-v22.0.0/lib/yargs-parser.ts#L961)), so `-c5` works but `-nfoo` does not.
- arg throws when a value-taking short flag is followed by more characters in the group.

## Proposed rule

In a short-flag group, scan left to right. When a defined flag takes a value:

1. If characters remain, the rest of the token is the value. Strip one leading `=`, so `-n=foo` keeps today's result and matches argparse and clap.
2. If it is the last character, the next argv element is the value, as today.

Flags that do not take a value, and unknown flags, keep today's behavior. The scan is still one pass with no backtracking.

## Interactions

- **Digit aliases.** With `c` value-taking and `5` a defined alias, `-c5` gives `count: 5`. getopt makes the same choice: the value-taking flag wins over later characters.
- **Value delimiters `:` and `.`.** Today `-n:foo` and `-n.foo` give `name: "foo"`. Under the rule they would give `":foo"` and `".foo"`, unless the delimiters are also stripped. Decision needed. Stripping keeps current behavior.
- **`spliceFromArgv`.** Removing a group like `-vnfoo` from argv must remove the whole value, not one character. When `ignore` skips part of a group, the kept remainder must keep its meaning; see the [forwarding hazard](./flag-names.md#forwarding-hazard-partially-consumed-groups) that exists today.
- **Single-dash long names.** A user who types `-output` meaning `--output` gets `-o` with the value `utput` when `o` takes a value. Today the same input parses as the aliases `o`, `u`, `t`, `p`, `u`, `t`. pflag users reported this surprise in [spf13/pflag#314](https://github.com/spf13/pflag/issues/314). That issue shows the hazard exists, not how often it happens.

## Compatibility

Breaking against `5.0.0-beta.20`. Two classes of input change:

- **Inputs that lose data today:** `-nfoo` and `-c5` produce `""`, `NaN`, or unknown flags. These results look accidental, but they are observable, so a CLI could still rely on them.
- **Defined flags after a value-taking flag in one group:** `-nv foo` gives `name: ""`, `verbose: true` today and would give `name: "v"`. Both flags are defined and no unknown flag is reported, so a CLI can rely on the current result. This is a real breaking case.

## When to revisit

- A user depends on `-abc` grouping where `a` takes a value and `b`, `c` are meant as flags.
