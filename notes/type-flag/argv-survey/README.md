# argv survey harness

Runs the same argv cases through several parsers so the notes in [`..`](../README.md) can cite observed behavior. [`results.md`](./results.md) holds the latest output.

- [`cases.json`](./cases.json): the argv cases, grouped by topic.
- [`survey.mjs`](./survey.mjs): runs each case through node `parseArgs`, commander, yargs-parser, minimist, mri, arg, type-flag, argparse, and clap. Each adapter approximates one schema (see the comment at the top of the file); the [differences](#adapter-differences) matter when reading results.
- [`argparse_survey.py`](./argparse_survey.py) and [`clap/`](./clap/): one-argv adapters that `survey.mjs` calls in a subprocess.
- [`type-flag-probes.mjs`](./type-flag-probes.mjs): type-flag behaviors with no cross-parser equivalent (`ignore`, error naming, unreachable names, `getFlag`).

## Adapter differences

Not every parser can express the shared schema. Read a result as evidence only for the configuration its adapter uses:

| Parser | `count` | `size` validator | `--no-verbose` | Other |
| --- | --- | --- | --- | --- |
| node `parseArgs` | string | none (no type functions) | `allowNegative: true` | strict mode (the default) |
| commander | `Number` | throws `InvalidArgumentError` | separate `--no-verbose` option | leaf command (no subcommands) |
| yargs-parser | `number` | `coerce` | built-in `boolean-negation` | |
| minimist, mri | no type | none | built-in | minimist reports unset booleans as `false` |
| arg | `Number` | handler function | none | |
| type-flag | `Number` | type function | `booleanNegation: true` | |
| argparse | `float` | `type` function | `BooleanOptionalAction` | positionals in `nargs='*'` |
| clap | `f64` | `value_parser` | separate flag with `overrides_with` | `name` is `Option<String>`, so repeating it is an error |

## Regenerate

```sh
mkdir /tmp/argv-deps && cd /tmp/argv-deps
printf '{"private":true}' > package.json
pnpm add commander@14.0.3 yargs-parser@22.0.0 minimist@1.2.8 mri@1.2.0 arg@5.0.2 type-flag@5.0.0-beta.20

mkdir /tmp/argv-deps-v4 && cd /tmp/argv-deps-v4
printf '{"private":true}' > package.json
pnpm add type-flag@4.5.2

cd <repo>/notes/type-flag/argv-survey
CARGO_TARGET_DIR=/tmp/clap-survey-target cargo build --release --manifest-path clap/Cargo.toml
node survey.mjs /tmp/argv-deps /tmp/clap-survey-target/release/clap-survey
node type-flag-probes.mjs /tmp/argv-deps-v4
node type-flag-probes.mjs /tmp/argv-deps
```

`survey.mjs` needs `python3.14` on `PATH`. Keep `CARGO_TARGET_DIR` outside the repository so build output is not committed.
