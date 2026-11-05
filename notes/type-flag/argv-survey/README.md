# argv survey harness

Runs the same argv cases through several parsers so the notes in [`..`](../README.md) can cite observed behavior. [`results.md`](./results.md) holds the latest output.

- [`cases.json`](./cases.json): the argv cases, grouped by topic.
- [`survey.mjs`](./survey.mjs): runs each case through node `parseArgs`, commander, yargs-parser, minimist, mri, arg, type-flag, argparse, and clap. Every parser gets the same schema (see the comment at the top of the file).
- [`argparse_survey.py`](./argparse_survey.py) and [`clap/`](./clap/): one-argv adapters that `survey.mjs` calls in a subprocess.
- [`type-flag-probes.mjs`](./type-flag-probes.mjs): type-flag behaviors with no cross-parser equivalent (`ignore`, error naming, unreachable names, `getFlag`).

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
