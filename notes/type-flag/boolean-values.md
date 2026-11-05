# Boolean flag values

Researched 2026-11-05 against type-flag `v5.0.0-beta.20`. Not shipped.

## Summary

- **Explicit values (`--verbose=0`):** type-flag treats only the exact string `false` as false, so `--verbose=0`, `--verbose=FALSE`, `--verbose=no`, and the typo `--verbose=flase` all give `true`. Recommendation: accept a fixed set of true and false literals, and decide a result for any other value (an error or an unknown flag).
- **Negation with a value (`--no-verbose=false`):** type-flag applies the negation and ignores the attached value, so `--no-verbose=false` and `--no-verbose=true` both give `false`. It is the only surveyed configuration that does this. Recommendation: when `no-verbose` is not itself a defined flag, treat `--no-verbose=value` as an unknown flag.

## Explicit values

Observed ([results](./argv-survey/results.md#boolean-values)):

| Parser | `=false` | `=0` | `=FALSE` | `=no` | `=` (empty) |
| --- | --- | --- | --- | --- | --- |
| type-flag | false | true | true | true | true |
| yargs-parser | false | false | false | false | false |
| minimist, mri | false | true | true | true | true |
| arg | true | true | true | true | true |
| parseArgs, commander, argparse, clap | error | error | error | error | error |

The table shows only the boolean result. mri also turns the value of `=0` and `=FALSE` into a positional ([results](./argv-survey/results.md#boolean-values)).

The permissive parsers each use one literal with opposite defaults:

- type-flag and minimist: anything except `false` is true ([utils.ts#L76](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/utils.ts#L76): `return value !== 'false'`).
- yargs-parser: anything except `true` is false: `val = val === 'true'` ([yargs-parser.ts#L620](https://github.com/yargs/yargs-parser/blob/yargs-parser-v22.0.0/lib/yargs-parser.ts#L620)).

Neither rule catches typos. Go and clap are examples of strict literal sets that reject other values:

- Go `strconv.ParseBool`, used by Go `flag` ([flag.go#L133](https://github.com/golang/go/blob/go1.25.0/src/flag/flag.go#L133)) and pflag ([bool.go#L21](https://github.com/spf13/pflag/blob/v1.0.10/bool.go#L21)), accepts `1 t T true TRUE True` and `0 f F false FALSE False`, and returns an error for anything else ([atob.go#L8-L18](https://github.com/golang/go/blob/go1.25.0/src/strconv/atob.go#L8-L18)). It lists three spellings per word; it is not case-insensitive, so `tRuE` is an error.
- clap's opt-in `BoolishValueParser` accepts `y yes t true on 1` and `n no f false off 0` ([str_to_bool.rs#L2-L5](https://github.com/clap-rs/clap/blob/v4.5.40/clap_builder/src/util/str_to_bool.rs#L2-L5)).

Options for type-flag:

1. **Go's set**, exactly as listed. The narrowest set with a major precedent. A case-insensitive match of `true`, `false`, `t`, `f`, `1`, and `0` would be an extension of it, not Go's behavior.
2. **clap's set** (adds `yes`/`no`/`y`/`n`/`on`/`off`).
3. **Keep today's rule.** No error path, but typos silently mean `true`.

An unrecognized value needs a defined result. Throwing `FlagParseError` matches how type-flag reports other bad values. `--verbose=` (empty) also needs a decision: Go and clap reject it.

## Negation with a value

| Parser | `--no-verbose=false` |
| --- | --- |
| type-flag | `verbose: false` (value ignored) |
| yargs-parser, minimist | unknown flag `no-verbose` |
| mri | unknown flag `verbose=false` |
| parseArgs, commander, argparse, clap, arg | error (arg has no negation) |

argparse's message is "ignored explicit argument 'false'" ([argparse.py#L2160](https://github.com/python/cpython/blob/v3.14.0/Lib/argparse.py#L2160)). Recommendation: treat `--no-x=value` as an unknown flag, like yargs-parser, when `no-x` is not itself defined. A schema can define a flag named `no-x`, and type-flag looks up defined flags before negation ([type-flag.ts#L87-L104](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/type-flag.ts#L87-L104)): `typeFlag({ 'no-verbose': String }, ['--no-verbose=false'], { booleanNegation: true })` gives `'no-verbose': 'false'`. The proposal must keep that working. It avoids a new error path, but it is still a change: the negation branch sets `false` regardless of the value today ([type-flag.ts#L134-L141](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/type-flag.ts#L134-L141)).

## Kept: `--verbose false`

All surveyed parsers except yargs-parser, minimist, and mri give `verbose: true` and the positional `false`. type-flag matches the majority, and the README documents it.

## Compatibility

Both changes break observable behavior of `5.0.0-beta.20` ([utils.ts#L71-L79](https://github.com/privatenumber/type-flag/blob/v5.0.0-beta.20/src/utils.ts#L71-L79)):

| Input | Today | Proposed |
| --- | --- | --- |
| `--verbose=0`, `=f`, `=FALSE` | `true` | `false` |
| `--verbose=custom` (outside the set) | `true` | error or unknown flag (decision needed) |
| `--verbose=` | `true` | decision needed |
| `--no-verbose=false` | `false` | unknown flag |

Whether today's results for these inputs are mistakes is a policy decision, not a fact about existing callers. type-flag currently documents only `--verbose=false`.
