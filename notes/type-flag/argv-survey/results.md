# Survey results

Generated 2026-11-05 by `survey.mjs` and `type-flag-probes.mjs`. Do not edit by hand; see the README for how to regenerate.

Environment: macOS, Node.js v24.13.1, Python 3.14.7, Rust 1.98.0. Parsers: commander 14.0.3, yargs-parser 22.0.0, minimist 1.2.8, mri 1.2.0, arg 5.0.2, type-flag 5.0.0-beta.20, argparse (Python 3.14), clap 4.5.40.

Cell legend: `key=value` is a parsed flag, `_=[...]` is positionals, `?key=value` is an unknown flag, `error: ...` is a thrown error.

## Cross-parser survey

### short-flag-values

| Parser | `-nfoo` | `-c5` | `-vnfoo` | `-nv foo` | `-n=foo` |
| --- | --- | --- | --- | --- | --- |
| node parseArgs | name="foo" | count="5" | name="foo" verbose=true | name="v" _=["foo"] | name="=foo" |
| commander | name="foo" | count=5 | name="foo" verbose=true | name="v" _=["foo"] | name="=foo" |
| yargs-parser | name="" ?f=true ?o=[true,true] | count=5 | name="" verbose=true ?f=true ?o=[true,true] | name="" verbose=true _=["foo"] | name="foo" |
| minimist | name="" verbose=false eacute=false ?f=true ?o=true | verbose=false count=5 eacute=false | name="" verbose=true eacute=false ?f=true ?o=true | name="" verbose=true eacute=false _=["foo"] | name="foo" verbose=false eacute=false |
| mri | name="" ?f=true ?o=[true,true] | count=true ?5=true | name="" verbose=true ?f=true ?o=[true,true] | name="" verbose=true _=["foo"] | name="foo" |
| arg | error: option requires argument (but was followed by another short argument): -n | error: option requires argument (but was followed by another short argument): -c | error: option requires argument (but was followed by another short argument): -n | error: option requires argument (but was followed by another short argument): -n | error: option requires argument (but was followed by another short argument): -n |
| type-flag | name="" ?f=[true] ?o=[true,true] | count=NaN ?5=[true] | name="" verbose=true ?f=[true] ?o=[true,true] | name="" verbose=true _=["foo"] | name="foo" |
| argparse | name="foo" | count=5.0 | name="foo" verbose=true | name="v" _=["foo"] | name="foo" |
| clap | name="foo" | count=5 | name="foo" verbose=true | name="v" _=["foo"] | name="foo" |

### standalone-dash-digit

| Parser | `-5` | `file -5` | `file -5..10` |
| --- | --- | --- | --- |
| node parseArgs | error: Unknown option '-5'. To specify a positional argument starting with a '-', place it at the end of the command after '--', as in '-- "-5" | error: Unknown option '-5'. To specify a positional argument starting with a '-', place it at the end of the command after '--', as in '-- "-5" | error: Unknown option '-5'. To specify a positional argument starting with a '-', place it at the end of the command after '--', as in '-- "-5" |
| commander | _=["-5"] | _=["file","-5"] | error: unknown option '-5..10' |
| yargs-parser | _=[-5] | _=["file",-5] | _=["file"] ?5={"":{"10":true}} |
| minimist | verbose=false eacute=false ?5=true | verbose=false eacute=false _=["file"] ?5=true | verbose=false eacute=false _=["file"] ?5="..10" |
| mri | ?5=true | _=["file"] ?5=true | _=["file"] ?0=true ?1=true ?5=true ?.=[true,true] |
| arg | error: unknown or unexpected option: -5 | error: unknown or unexpected option: -5 | error: unknown or unexpected option: -5 |
| type-flag | ?5=[true] | _=["file"] ?5=[true] | _=["file"] ?5=[".10"] |
| argparse | _=["-5"] | _=["file", "-5"] | _=["file", "-5..10"] |
| clap | error: unexpected argument '-5' found | error: unexpected argument '-5' found | error: unexpected argument '-5' found |

### boolean-values

| Parser | `--verbose=false` | `--verbose=0` | `--verbose=FALSE` | `--verbose=no` | `--verbose=` | `--verbose false` | `--no-verbose` | `--no-verbose=false` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| node parseArgs | error: Option '-v, --verbose' does not take an argument | error: Option '-v, --verbose' does not take an argument | error: Option '-v, --verbose' does not take an argument | error: Option '-v, --verbose' does not take an argument | error: Option '-v, --verbose' does not take an argument | verbose=true _=["false"] | verbose=false | error: Option '-v, --verbose' does not take an argument |
| commander | error: unknown option '--verbose=false' | error: unknown option '--verbose=0' | error: unknown option '--verbose=FALSE' | error: unknown option '--verbose=no' | error: unknown option '--verbose=' | verbose=true _=["false"] | verbose=false | error: unknown option '--no-verbose=false' |
| yargs-parser | verbose=false | verbose=false | verbose=false | verbose=false | verbose=false | verbose=false | verbose=false | ?no-verbose="false" ?noVerbose="false" |
| minimist | verbose=false eacute=false | verbose=true eacute=false | verbose=true eacute=false | verbose=true eacute=false | verbose=true eacute=false | verbose=false eacute=false | verbose=false eacute=false | verbose=false eacute=false ?no-verbose="false" |
| mri | verbose=false | verbose=true _=[0] | verbose=true _=["FALSE"] | verbose=true _=["no"] | verbose=true | verbose=false | verbose=false | ?verbose=false=false |
| arg | verbose=true | verbose=true | verbose=true | verbose=true | verbose=true | verbose=true _=["false"] | error: unknown or unexpected option: --no-verbose | error: unknown or unexpected option: --no-verbose |
| type-flag | verbose=false | verbose=true | verbose=true | verbose=true | verbose=true | verbose=true _=["false"] | verbose=false | verbose=false |
| argparse | error: argument -v/--verbose/--no-verbose: ignored explicit argument 'false' | error: argument -v/--verbose/--no-verbose: ignored explicit argument '0' | error: argument -v/--verbose/--no-verbose: ignored explicit argument 'FALSE' | error: argument -v/--verbose/--no-verbose: ignored explicit argument 'no' | error: argument -v/--verbose/--no-verbose: ignored explicit argument '' | verbose=true _=["false"] | verbose=false | error: argument -v/--verbose/--no-verbose: ignored explicit argument 'false' |
| clap | error: unexpected value 'false' for '--verbose' found; no more were expected | error: unexpected value '0' for '--verbose' found; no more were expected | error: unexpected value 'FALSE' for '--verbose' found; no more were expected | error: unexpected value 'no' for '--verbose' found; no more were expected | error: unexpected value '' for '--verbose' found; no more were expected | verbose=true _=["false"] | verbose=false | error: unexpected value 'false' for '--no-verbose' found; no more were expected |

### flag-names

| Parser | `--über x` | `-é` |
| --- | --- | --- |
| node parseArgs | über="x" | eacute=true |
| commander | über="x" | eacute=true |
| yargs-parser | über="x" | eacute=true |
| minimist | verbose=false über="x" eacute=false | verbose=false eacute=true |
| mri | über="x" | eacute=true |
| arg | über="x" | eacute=true |
| type-flag | _=["--über","x"] | _=["-é"] |
| argparse | über="x" | eacute=true |
| clap | über="x" | eacute=true |

### value-slot-double-dash

| Parser | `--name -- x` |
| --- | --- |
| node parseArgs | error: Option '--name' argument is ambiguous. |
| commander | name="--" _=["x"] |
| yargs-parser | name="" _=["x"] |
| minimist | name="" verbose=false eacute=false _=["x"] |
| mri | name="" _=["x"] |
| arg | error: option requires argument: --name |
| type-flag | name="" _=["x"] |
| argparse | error: argument -n/--name: expected one argument |
| clap | error: a value is required for '--name <NAME>' but none was supplied |

### missing-values

| Parser | `--name` | `--count` |
| --- | --- | --- |
| node parseArgs | error: Option '-n, --name <value>' argument missing | error: Option '-c, --count <value>' argument missing |
| commander | error: option '-n, --name <value>' argument missing | error: option '-c, --count <value>' argument missing |
| yargs-parser | name="" | (nothing) |
| minimist | name="" verbose=false eacute=false | verbose=false count=true eacute=false |
| mri | name="" | count=true |
| arg | error: option requires argument: --name | error: option requires argument: --count |
| type-flag | name="" | count=NaN |
| argparse | error: argument -n/--name: expected one argument | error: argument -c/--count: expected one argument |
| clap | error: a value is required for '--name <NAME>' but none was supplied | error: a value is required for '--count <COUNT>' but none was supplied |

### repeated-flags

| Parser | `--name a --name b` |
| --- | --- |
| node parseArgs | name="b" |
| commander | name="b" |
| yargs-parser | name=["a","b"] |
| minimist | name=["a","b"] verbose=false eacute=false |
| mri | name=["a","b"] |
| arg | name="b" |
| type-flag | name="b" |
| argparse | name="b" |
| clap | error: the argument '--name <NAME>' cannot be used multiple times |

### error-messages

| Parser | `-s bad` | `--size bad` |
| --- | --- | --- |
| node parseArgs | size="bad" | size="bad" |
| commander | error: option '-s, --size <value>' argument 'bad' is invalid. bad size | error: option '-s, --size <value>' argument 'bad' is invalid. bad size |
| yargs-parser | error: bad size | error: bad size |
| minimist | verbose=false size="bad" eacute=false | verbose=false size="bad" eacute=false |
| mri | size="bad" | size="bad" |
| arg | error: bad size | error: bad size |
| type-flag | error: Flag "--s": bad size | error: Flag "--size": bad size |
| argparse | error: argument -s/--size: bad size | error: argument -s/--size: bad size |
| clap | error: invalid value 'bad' for '--size <SIZE>': bad size | error: invalid value 'bad' for '--size <SIZE>': bad size |

## type-flag probes

type-flag 4.5.2

| Probe | Result |
| --- | --- |
| ignore defined flags: `--name x pos` | {"flags":{},"unknownFlags":{},"_":["x","pos"],"argv":["--name"]} |
| ignore unknown flags: `--target value --name y` | {"flags":{"name":"y"},"unknownFlags":{},"_":["value"],"argv":["--target"]} |
| alias error: `-s bad` | throws Error: bad size (flagName: undefined) |
| single-character flag error: `-x bad` | throws Error: bad size (flagName: undefined) |
| define `über`, then `--über x` | {"flags":{},"unknownFlags":{},"_":["--über","x"],"argv":[]} |
| define alias `é`, then `-é` | {"flags":{},"unknownFlags":{},"_":["-é"],"argv":[]} |
| define alias `=`, then `-=` | {"flags":{},"unknownFlags":{},"_":["-=","x"],"argv":[]} |
| define key `-x`, then `---x` | {"flags":{},"unknownFlags":{},"_":["---x"],"argv":[]} |
| getFlag(`-h`) with `--h` | {"value":true,"argv":[]} |
| getFlag(`--a, -b`) with `-b` | {"argv":["-b"]} |
| getFlag(`a`) with `--a x` | {"argv":["--a","x"]} |
| getFlag(`--name`) with `--name x --name y` | {"value":"x","argv":["--name","y"]} |

type-flag 5.0.0-beta.20

| Probe | Result |
| --- | --- |
| ignore defined flags: `--name x pos` | {"flags":{},"unknownFlags":{},"_":["x","pos"],"argv":["--name"]} |
| ignore unknown flags: `--target value --name y` | {"flags":{"name":"y"},"unknownFlags":{},"_":["value"],"argv":["--target"]} |
| alias error: `-s bad` | throws FlagParseError: Flag "--s": bad size (flagName: "s") |
| single-character flag error: `-x bad` | throws FlagParseError: Flag "--x": bad size (flagName: "x") |
| define `über`, then `--über x` | {"flags":{},"unknownFlags":{},"_":["--über","x"],"argv":[]} |
| define alias `é`, then `-é` | {"flags":{},"unknownFlags":{},"_":["-é"],"argv":[]} |
| define alias `=`, then `-=` | {"flags":{},"unknownFlags":{},"_":["-=","x"],"argv":[]} |
| define key `-x`, then `---x` | {"flags":{},"unknownFlags":{},"_":["---x"],"argv":[]} |
| getFlag(`-h`) with `--h` | {"value":true,"argv":[]} |
| getFlag(`--a, -b`) with `-b` | {"argv":["-b"]} |
| getFlag(`a`) with `--a x` | {"argv":["--a","x"]} |
| getFlag(`--name`) with `--name x --name y` | {"value":"x","argv":["--name","y"]} |
