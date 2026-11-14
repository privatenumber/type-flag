# Short flag values: `-nfoo` and `-vnfoo`

Researched 2026-11-05 against type-flag `v5.0.0-beta.20`. The decision below ships in this PR.

## Summary

Decision: support attached short values. When a short flag that takes a value appears in a group, the rest of the token is its value. POSIX requires conforming standard utilities to accept this form. In the survey, node `parseArgs`, commander, argparse, and clap accept `-nfoo` and `-c5`. yargs-parser and minimist read `-c5` as a value for `count` but parse `-nfoo` as more flags. arg throws, and mri and the surveyed type-flag version parse the rest of both as more flags. Adapter configurations differ; see the caveat below.

The previous README listed "does not parse POSIX-style short string values like `-ovalue`" as an intentional trade-off. That line came from a docs comparison with `parseArgs()` ([`e0715a9`](https://github.com/privatenumber/type-flag/commit/e0715a9720376c2ad303e7f008c5bc97ddd286e4)), not from a recorded design decision.

## Behavior before this decision

Schema: `name` is a string with alias `n`, `verbose` is a boolean with alias `v`, and `count` is a number with alias `c` ([results](./argv-survey/results.md#short-flag-values)). Not every adapter can declare a number: node `parseArgs` declares `count` as a string (so it reports `"5"`), and the minimist and mri adapters declare no type for it ([adapter differences](./argv-survey/README.md#adapter-differences)).

| Input | type-flag | getopt rule (parseArgs, commander, argparse, clap) |
| --- | --- | --- |
| `-nfoo` | `name: ""`, unknown flags `f` and `o` | `name: "foo"` |
| `-c5` | `count: NaN`, unknown flag `5` | `count: 5` |
| `-vnfoo` | `name: ""`, `verbose: true`, unknown `f`, `o` | `name: "foo"`, `verbose: true` |
| `-nv foo` | `name: ""`, `verbose: true`, `_: ['foo']` | `name: "v"`, `_: ['foo']` |
| `-n=foo` | `name: "foo"` | argparse, clap: `"foo"`. parseArgs, commander: `"=foo"` |

The previous behavior loses data silently. `-c5` reads as "count 5" to a user but yields `NaN`, and the type function never sees `5`.

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

## Decision

In a short-flag group, scan left to right. When a defined flag takes a value:

1. If characters remain, the rest of the token is the value. Strip exactly one leading `=`, `:`, or `.`, preserving the existing delimiter forms.
2. If it is the last character, it takes the next argument, if present, unless it is `--` or a flag-shaped token. A token starting with a dash and a number, such as `-5`, is taken as a value unless every character after the dash is a defined flag. With `n: String`, `['-n', '--verbose']` gives `n: ''`.

Flags that do not take a value, and unknown flags, keep today's behavior. The scan is still one pass with no backtracking.

## Interactions

- **Digit aliases.** With `c` value-taking and `5` a defined alias, `-c5` gives `count: 5`. getopt makes the same choice: the value-taking flag wins over later characters.
- **Value delimiters `:` and `.`.** Stripping these as well as `=` preserves the previous `-n:foo` and `-n.foo` behavior. Only one delimiter is stripped, so `-n==foo` gives `=foo`.
- **`spliceFromArgv`.** Removing a group like `-vnfoo` from argv must remove the whole value, not one character. Partial extraction can change the meaning of the kept remainder; see the [forwarding hazard](./flag-names.md#forwarding-hazard-partially-consumed-groups).
- **Unknown flags when forwarding.** Keep scanning unknown characters: the wrapper only knows its own schema and cannot tell that another parser treats `-nvalue` as `n: 'value'`. Extracting Boolean `v`, including via `ignore` for unknown flags, leaves `-nalue` ([getFlag test](../../tests/specs/get-flag/parsing.ts), [typeFlag test](../../tests/specs/type-flag/parsing.ts)). Use `-n value` or a long form such as `--name=value` when forwarding (`-n=value` is parser-dependent: Node's `util.parseArgs` and commander read it as `=value`), preserving the separate value argument if using `ignore`.
- **Single-dash long names.** A user who types `-output` meaning `--output` gets `-o` with the value `utput` when `o` takes a value. Previously the same input parsed as the aliases `o`, `u`, `t`, `p`, `u`, `t`. Long flags require `--`. pflag users reported this surprise in [spf13/pflag#314](https://github.com/spf13/pflag/issues/314). That issue shows the hazard exists, not how often it happens.

## Rejected alternatives

- Keep parsing each character as a flag: this silently loses attached values such as `-c5`.
- Accept only a numeric suffix, as yargs-parser does: this leaves string values such as `-nfoo` unsupported.
- Reject grouped value-taking flags, as arg does: this prevents the POSIX-style forms rather than supporting them.
- Strip only `=`: this would change the existing `:` and `.` delimiter forms.
- Stop scanning at the first unknown character when forwarding: this silently misses the wrapper's own `v` in `-xv`. Continuing can silently remove a character from another parser's attached value instead; neither choice knows the other parser's schema.

## Compatibility

Breaking against `5.0.0-beta.20`. Two classes of input change:

- **Inputs that lose data today:** `-nfoo` and `-c5` produce `""`, `NaN`, or unknown flags. These results look accidental, but they are observable, so a CLI could still rely on them.
- **Defined flags after a value-taking flag in one group:** `-nv foo` previously gave `name: ""`, `verbose: true`, and positional `foo`; it now gives `name: "v"`, leaves `verbose` unset, and keeps positional `foo`. Both flags were defined and no unknown flag was reported, so a CLI can rely on the previous result. This is a real breaking case.

## When to revisit

- A user depends on `-abc` grouping where `a` takes a value and `b`, `c` are meant as flags.
