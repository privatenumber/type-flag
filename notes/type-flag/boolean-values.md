# Boolean flag values

Researched 2026-11-05 against type-flag `v5.0.0-beta.20`. Not shipped.

## Summary

- **Explicit values (`--verbose=0`):** type-flag treats only the exact string `false` as false, so `--verbose=0`, `--verbose=FALSE`, `--verbose=no`, and the typo `--verbose=flase` all give `true`. Recommendation: accept a fixed set of true and false literals, matched case-insensitively, and treat any other value as an error or an unknown flag.
- **Negation with a value (`--no-verbose=false`):** type-flag ignores the value and gives `false`. Recommendation: treat it as an unknown flag. No surveyed parser accepts it.

## Explicit values

Observed ([results](./argv-survey/results.md#boolean-values)):

| Parser | `=false` | `=0` | `=FALSE` | `=no` | `=` (empty) |
| --- | --- | --- | --- | --- | --- |
| type-flag | false | true | true | true | true |
| yargs-parser | false | false | false | false | false |
| minimist, mri | false | true | true | true | true |
| arg | true | true | true | true | true |
| parseArgs, commander, argparse, clap | error | error | error | error | error |

The permissive parsers each use one literal with opposite defaults:

- type-flag and minimist: anything except `false` is true ([utils.ts#L76](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/utils.ts#L76): `return value !== 'false'`).
- yargs-parser: anything except `true` is false: `val = val === 'true'` ([yargs-parser.ts#L620](https://github.com/yargs/yargs-parser/blob/yargs-parser-v22.0.0/lib/yargs-parser.ts#L620)).

Neither rule catches typos. Parsers that accept boolean values use fixed literal sets:

- Go `strconv.ParseBool`, used by Go `flag` ([flag.go#L133](https://github.com/golang/go/blob/go1.25.0/src/flag/flag.go#L133)) and pflag ([bool.go#L21](https://github.com/spf13/pflag/blob/v1.0.10/bool.go#L21)), accepts `1 t T true TRUE True` and `0 f F false FALSE False`, and returns an error for anything else ([atob.go#L10-L15](https://github.com/golang/go/blob/go1.25.0/src/strconv/atob.go#L10-L15)).
- clap's opt-in `BoolishValueParser` accepts `y yes t true on 1` and `n no f false off 0` ([str_to_bool.rs#L2-L5](https://github.com/clap-rs/clap/blob/v4.5.40/clap_builder/src/util/str_to_bool.rs#L2-L5)).

Options for type-flag:

1. **Go's set** (`true`/`false`/`t`/`f`/`1`/`0`, case-insensitive). The narrowest set with a major precedent.
2. **clap's set** (adds `yes`/`no`/`y`/`n`/`on`/`off`).
3. **Keep today's rule.** No error path, but typos silently mean `true`.

An unrecognized value needs a defined result. Throwing `FlagParseError` matches how type-flag reports other bad values. `--verbose=` (empty) also needs a decision: Go and clap reject it.

## Negation with a value

| Parser | `--no-verbose=false` |
| --- | --- |
| type-flag | `verbose: false` (value ignored) |
| yargs-parser | unknown flag `no-verbose` |
| parseArgs, commander, argparse, clap | error |

argparse's message is "ignored explicit argument 'false'" ([argparse.py#L2160](https://github.com/python/cpython/blob/v3.14.0/Lib/argparse.py#L2160)). Recommendation: treat `--no-x=value` as an unknown flag, like yargs-parser. This fits type-flag's existing rule that `--no-` only applies to a bare boolean flag, and it avoids a new error path.

## Kept: `--verbose false`

All surveyed parsers except yargs-parser, minimist, and mri give `verbose: true` and the positional `false`. type-flag matches the majority, and the README documents it.

## Compatibility

Both changes break against `5.0.0-beta.20` only for inputs that are ambiguous or wrong today.
