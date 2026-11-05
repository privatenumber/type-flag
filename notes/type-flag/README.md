# type-flag

Parsing policy for type-flag and the evidence behind it. Cross-parser observations come from the [argv survey harness](./argv-survey/README.md) and its [results](./argv-survey/results.md).

| Note | Verdict |
| --- | --- |
| [Dash-prefixed flag values](./dash-prefixed-values.md) | Shipped in [#91](https://github.com/privatenumber/type-flag/issues/91): `--range -5..10` is a value. Proposed: a standalone `-5` becomes a positional. Kept: `--` right after a flag ends parsing. |
| [Short flag values](./short-flag-values.md) | Proposed: `-nfoo` and `-c5` give the value to the flag, as POSIX and getopt do. |
| [Boolean flag values](./boolean-values.md) | Proposed: a fixed set of true and false literals instead of "anything but `false` is true". `--no-x=value` becomes an unknown flag when `no-x` is not defined. |
| [Flag names and aliases](./flag-names.md) | Fix: `--über` and `-é` cannot start a token. Reject `=`, `.`, and `:` aliases, which never match. Decide: names starting with `-` and alias `-`. Records a forwarding hazard for partially consumed groups. |
| [Error messages](./error-messages.md) | Fix: `FlagParseError` prints `--s` for alias `-s`. Name the flag by its definition. |
| [`ignore` and flag values](./ignore.md) | Fix: an ignored flag's value is parsed as a positional. |
| [`getFlag` consistency](./get-flag.md) | Fix: `--h` matches `-h`, and invalid names fail silently. Decide: first or last occurrence wins. |
| [Missing flag values](./missing-values.md) | Kept: a missing value gives `""` to the type function. |
