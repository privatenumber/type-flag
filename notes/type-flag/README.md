# type-flag

Parsing policy for type-flag and the evidence behind it. Cross-parser observations come from the [argv survey harness](./argv-survey/README.md) and its [results](./argv-survey/results.md).

| Note | Verdict |
| --- | --- |
| [Dash-prefixed flag values](./dash-prefixed-values.md) | Shipped in [#91](https://github.com/privatenumber/type-flag/issues/91): `--range -5..10` is a value. Proposed: a standalone `-5` becomes a positional. Kept: `--` right after a flag ends parsing. |
| [Short flag values](./short-flag-values.md) | Proposed: `-nfoo` and `-c5` give the value to the flag, as POSIX and getopt do. |
| [Boolean flag values](./boolean-values.md) | Fixed: explicit values accept only `true` and `false`; `--no-x=value` is unknown when `no-x` is not defined. |
| [Flag names and aliases](./flag-names.md) | Unicode flag starts work; partially consumed groups retain their original order except for removal of a `--` remainder, with documented forwarding limitations. |
| [Error messages](./error-messages.md) | Fixed: `FlagParseError` names the flag by its definition. |
| [`ignore` and flag values](./ignore.md) | Fixed: an ignored defined flag keeps its value in argv. |
| [`getFlag` consistency](./get-flag.md) | Fixed: last occurrence wins, dash forms match exactly, and invalid search names throw. |
| [Missing flag values](./missing-values.md) | Kept: a missing value gives `""` to the type function. |
