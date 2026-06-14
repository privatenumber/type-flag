<p align="center">
	<img width="100" src=".github/logo.webp">
</p>
<h1 align="center">
	type-flag
	<br>
	<a href="https://npm.im/type-flag"><img src="https://badgen.net/npm/v/type-flag"></a> <a href="https://npm.im/type-flag"><img src="https://badgen.net/npm/dm/type-flag"></a>
</h1>

Tiny CLI flag parser whose schema returns TypeScript-inferred application values.

Use parser functions like `Number`, `Date`, enum validators, or object builders, then read clean output from `parsed.flags`.

No dependencies & tree-shakable (Max 1.4 kB).

→ [Try it out online](https://stackblitz.com/edit/type-flag-demo?devtoolsheight=50&file=src/type-flag.ts&view=editor)

Comparing parser options? [See how _type-flag_ differs from `util.parseArgs()`, `arg`, and `minimist`](#comparison-with-other-parsers).

> [!TIP]
> **Looking for a full CLI framework?**
>
> Try [**Cleye**](https://github.com/privatenumber/cleye), a CLI development tool powered by _type-flag_.
>
> It adds command routing, argument parsing, and a polished `--help` generator on top of flag parsing.

<p align="center">
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=398771"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/donate.webp"></a>
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=397608"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/sponsor.webp"></a>
</p>
<p align="center"><sup><i>Already a sponsor?</i> Join the discussion in the <a href="https://github.com/pvtnbr/tsx">Development repo</a>!</sup></p>

## Install

```sh
npm i type-flag
```

## Quick Start

```ts
import { typeFlag } from 'type-flag'

const parsed = typeFlag({
    name: String,
    age: Number
})

// $ my-script --name John --age 20
parsed.flags.name // string | undefined
parsed.flags.age // number | undefined
```

Need a short alias?

```ts
const parsed = typeFlag({
    age: {
        type: Number,
        alias: 'a'
    }
})

// $ my-script -a 20
parsed.flags.age // number | undefined
```

Only need one flag? Use `getFlag()` to extract a single typed value:

```ts
import { getFlag } from 'type-flag'

const age = getFlag('-a,--age', Number)

// $ my-script --age 20
age // number | undefined
```

## Why Type-flag?

- Parser functions return the values your app uses: numbers, dates, enums, objects, nullable values, or validated strings.
- TypeScript infers the output from the schema.
- The schema reads like application options: add `type`, `alias`, and `default` next to the flag they belong to.
- Output is clean: `flags.age`, not `result['--age']`.
- Unknown flags are separated for accurate errors or forwarding.
- Passing your own argv lets _type-flag_ remove parsed tokens and leave the rest.
- camelCase schema keys accept kebab-case CLI input.
- It stays small and focused: a flag parser, not a CLI framework.

## Usage

### Defining Typed Flags

Pass an object where each key is the flag name and each value is a parser function.

```ts
const parsed = typeFlag({
    stringFlag: String,
    numberFlag: Number,
    booleanFlag: Boolean,
    dateFlag: value => new Date(value)
})

parsed.flags.stringFlag // string | undefined
parsed.flags.numberFlag // number | undefined
parsed.flags.booleanFlag // boolean | undefined
parsed.flags.dateFlag // Date | undefined
```

Use object syntax when a flag needs an alias or default value:

```ts
const parsed = typeFlag({
    port: {
        type: Number,
        alias: 'p',
        default: 3000
    }
})

parsed.flags.port // number
```

To get `undefined` in parsed flag types, enable [`strict`](https://www.typescriptlang.org/tsconfig/#strict) or [`strictNullChecks`](https://www.typescriptlang.org/tsconfig#strictNullChecks).

### Custom Parser Functions

Parser functions can validate, narrow, or transform values before your app sees them.

```ts
const possibleSizes = ['small', 'medium', 'large'] as const

type Size = typeof possibleSizes[number]

const Size = (value: string): Size => {
    if (!possibleSizes.includes(value as Size)) {
        throw new Error(`Invalid size: "${value}"`)
    }

    return value as Size
}

const parsed = typeFlag({
    size: Size
})

parsed.flags.size // 'small' | 'medium' | 'large' | undefined
```

Custom parsers are also useful for richer values:

```ts
const EnvAssignment = (value: string) => {
    const [key, rawValue = true] = value.split('=')
    return { [key]: rawValue }
}

const parsed = typeFlag({
    env: [EnvAssignment]
})

// $ my-script --env.TOKEN=abc --env.CI
parsed.flags.env // Array<Record<string, string | boolean>>
```

### Standard Schema (Zod, Valibot, ArkType)

Any [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType, and others) can be used directly as a flag type. type-flag detects the schema, validates the value, and infers the flag type from the schema's output. No wrapper or extra import.

```ts
import * as z from 'zod'
import { typeFlag } from 'type-flag'

const parsed = typeFlag({
    size: z.enum(['small', 'medium', 'large']),
    port: z.coerce.number(),
    tags: [z.string()] // wrap in an array to accept multiple
})

parsed.flags.size // 'small' | 'medium' | 'large' | undefined
parsed.flags.port // number | undefined
parsed.flags.tags // string[]
```

It is library-agnostic, so any compliant schema works the same way:

```ts
import * as v from 'valibot'

const parsed = typeFlag({
    mode: v.picklist(['dev', 'prod'])
})

parsed.flags.mode // 'dev' | 'prod' | undefined
```

Schemas work everywhere a flag type is accepted, including arrays (`[z.string()]`), `{ type, default }` objects, and [`getFlag`](#getflag). On validation failure, the schema's error message is surfaced. This adds no runtime dependency: the Standard Schema spec is types-only and vendored in.

A few things to keep in mind:

- **Numbers need coercion.** CLI values are always strings, so `z.number()` rejects `"3000"`. Use `z.coerce.number()` (or your library's equivalent), then chain validators like `.int()`, `.min()`, and `.max()`.
- **For multiple values, wrap the schema in `[ ]`** (as with `tags` above), not `z.array(...)`. A schema that itself outputs an array validates a single CLI token against the array, so it type-checks but throws at runtime. To split one value into an array, use a transform such as `z.string().transform(value => value.split(','))`.
- **Keep booleans native.** Use `Boolean` rather than a schema for boolean flags, so valueless `--flag`, `--no-flag` negation, and short-flag grouping keep working.
- **Use type-flag's `default`.** type-flag only runs the parser when a flag is present, so a schema-level `.default()` never fires for an absent flag. Set [`default`](#default-values) on the flag instead.
- **Schemas must be synchronous.** Flag parsing is synchronous, so an async schema throws.

### Multiple Values

Wrap a parser function in an array to collect repeated values.

```ts
const parsed = typeFlag({
    tag: [String],
    port: [Number]
})

// $ my-script --tag app --tag cli --port 3000 --port=3001
parsed.flags.tag // string[]
parsed.flags.port // number[]
```

### Default Values

Flags default to `undefined`. Provide `default` to make the parsed type non-optional.

```ts
const parsed = typeFlag({
    retries: {
        type: Number,
        default: 3
    }
})

parsed.flags.retries // number
```

Use a factory for mutable defaults like arrays and objects:

```ts
const parsed = typeFlag({
    tags: {
        type: [String],
        default: () => []
    }
})

parsed.flags.tags // string[]
```

### Aliases And Short Groups

Set `alias` to accept a single-character short flag.

```ts
const parsed = typeFlag({
    verbose: {
        type: [Boolean],
        alias: 'v'
    }
})

// $ my-script -vvv
parsed.flags.verbose.length // 3
```

Short aliases can be grouped, so `-abc` is parsed as `-a -b -c`.

### camelCase Schema, kebab-case CLI

camelCase schema keys automatically accept kebab-case input.

```ts
const parsed = typeFlag({
    someString: [String]
})

// $ my-script --someString hello --some-string world
parsed.flags.someString // ['hello', 'world']
```

### Unknown Flags And Forwarding

Unknown flags are returned separately instead of being mixed into `flags`.

```ts
const parsed = typeFlag({})

// $ my-script --some-flag --some-flag=1234
parsed.unknownFlags // { 'some-flag': [true, '1234'] }
```

Wrapper CLIs often need to consume their own flags and pass everything else to another command. If you pass your own argv array, _type-flag_ removes parsed tokens and leaves ignored tokens behind.

Ignored tokens are left in `argv` exactly as passed, so an `ignore` callback can stop parsing at a command name and preserve the full command tail for another parser.

```ts
const argv = process.argv.slice(2)

const parsed = typeFlag(
    {
        config: String
    },
    argv,
    {
        ignore: type => type === 'unknown-flag'
    }
)

// $ wrapper --config local.json --target-flag=value
parsed.flags.config // string | undefined
argv // ['--target-flag=value']
```

You can also stop parsing after the first positional argument:

```ts
const argv = process.argv.slice(2)

let stopParsing = false
const parsed = typeFlag(
    {
        verbose: [Boolean]
    },
    argv,
    {
        ignore: (type) => {
            if (stopParsing) {
                return true
            }

            if (type === 'argument') {
                stopParsing = true
                return true
            }
        }
    }
)

// $ my-script --verbose ./file.js --verbose
parsed.flags.verbose // [true]
argv // ['./file.js', '--verbose']
```

### Arguments And `--`

Arguments are values that are not associated with a flag. They are stored in `_`.

Everything after the first `--` is treated as an argument and is also stored in `_['--']`. The `--` sentinel itself is omitted; later `--` tokens are ordinary arguments inside `_['--']`.

```ts
const parsed = typeFlag({
    myFlag: [String]
})

// $ my-script --my-flag value arg1 -- --my-flag world
parsed.flags.myFlag // ['value']
parsed._ // ['arg1', '--my-flag', 'world']
parsed._['--'] // ['--my-flag', 'world']
```

For `['one', '--', 'two']`, `parsed._.slice()` is `['one', 'two']` and `parsed._['--']` is `['two']`.

Parser and framework integrations that need to rebuild this shape can use `createPositionalArguments()`; see the API reference below.

### Value Delimiters

The characters `=`, `:`, and `.` delimit a value from a flag.

```sh
$ my-script --flag=value --flag:value --flag.value
```

This makes `define` and `env` style flags straightforward:

```ts
const parsed = typeFlag({
    define: String,
    env: [String]
})

// $ my-script --define:key=value --env.TOKEN=abc
parsed.flags.define // 'key=value'
parsed.flags.env // ['TOKEN=abc']
```

These are the supported delimiters; arbitrary delimiter characters are not treated as value separators.

### Boolean Negation

Enable `booleanNegation` to support `--no-` prefixed flags for booleans.

```ts
const parsed = typeFlag({
    verbose: Boolean
}, process.argv.slice(2), { booleanNegation: true })

// $ my-script --no-verbose
parsed.flags.verbose // false
```

Last value wins:

```ts
// $ my-script --verbose --no-verbose
parsed.flags.verbose // false

// $ my-script --no-verbose --verbose
parsed.flags.verbose // true
```

The `--no-` prefix only applies to flags defined as `Boolean`. For non-boolean or unregistered flags, `--no-<name>` is treated as an unknown flag.

You can also pass `false` explicitly with a value delimiter:

```ts
// $ my-script --verbose=false
parsed.flags.verbose // false
```

Without a value delimiter, `false` is a separate argument:

```ts
// $ my-script --verbose false
parsed.flags.verbose // true
parsed._ // ['false']
```

### Optional Value Flags

A parser can return different types depending on whether a value was provided.

```ts
const OptionalString = (value: string) => {
    if (!value) {
        return true
    }

    return value
}

const parsed = typeFlag({
    string: OptionalString
})

// $ my-script --string
parsed.flags.string // true

// $ my-script --string hello
parsed.flags.string // 'hello'
```

### Single-character Flag Names

A flag name can itself be a single character. It matches `-x` but not `--x`.

```ts
const parsed = typeFlag({
    x: Number,
    y: Number
})

// $ my-script -x 10 -y 20
parsed.flags.x // 10
parsed.flags.y // 20
```

Because `--x` is reserved for long flags, you can declare both a single-character flag and a long-form flag as independent entries:

```ts
const parsed = typeFlag({
    h: Boolean,
    help: Boolean
})

// $ my-script -h --help --h
parsed.flags.h // true
parsed.flags.help // true
parsed.unknownFlags.h // [true]
```

Use a single-character name when the short form is the flag (`-x`/`-y` coordinates, `-h` vs `--help`). Use an alias when `--verbose` and `-v` should set the same value.

A single-character flag cannot have an `alias`.

### getFlag()

Use `getFlag()` when you only need one typed flag and want to leave the rest of argv available for another parser or command.

```ts
const argv = process.argv.slice(2)

const port = getFlag('-p,--port', Number, argv)

// $ my-script --port 3000 -- --forwarded
port // number | undefined
argv // ['--', '--forwarded']
```

Wrap the parser in an array to retrieve all matching values.

```ts
const tag = getFlag('--tag', [String])

// $ my-script --tag app --tag cli
tag // string[]
```

## API

### typeFlag(flagSchema, argv, options)

Returns an object with the shape:

```ts
type Parsed = {
    flags: {
        [flagName: string]: InferredType
    }
    unknownFlags: {
        [flagName: string]: (string | boolean)[]
    }
    _: string[] & {
        '--': string[]
    }
}
```

#### flagSchema

Type:

```ts
type TypeFunction = (...args: any[]) => unknown

type FlagSchema = {
    [flagName: string]: TypeFunction | [TypeFunction] | {
        type: TypeFunction | [TypeFunction]
        alias?: string
        default?: unknown | (() => unknown)
    }
}
```

An object containing flag schema definitions. The key is the flag name, and the value is either a parser function, an array parser, or an object containing the parser plus options.

#### argv

Type: `string[]`

Default: `process.argv.slice(2)`

The argv array to parse. If you pass your own array, it is mutated to remove parsed flags and arguments.

#### options

Type:

```ts
type Options = {
    ignore?: (
        type: 'known-flag' | 'unknown-flag' | 'argument',
        flagOrArgv: string,
        value: string | undefined
    ) => boolean | void

    booleanNegation?: boolean
}
```

### getFlag(flagNames, flagType, argv)

#### flagNames

Type: `string`

A comma-separated list of flag names to parse.

#### flagType

Type:

```ts
type TypeFunction = (...args: any[]) => unknown

type FlagType = TypeFunction | [TypeFunction]
```

A function to parse the flag value. Wrap the function in an array to retrieve all values.

#### argv

Type: `string[]`

Default: `process.argv.slice(2)`

The argv array to parse. If you pass your own array, it is mutated to remove the parsed flag and its value.

### createPositionalArguments(argv)

Builds the same positional argument shape returned as `parsed._`. This is mainly useful for parser or framework integrations that already preserved an argv tail and need to expose type-flag-compatible positionals.

Type:

```ts
const createPositionalArguments: (argv: readonly string[]) => PositionalArguments

type PositionalArguments = string[] & {
    '--': string[]
}
```

The first `--` token is the delimiter. It is omitted from the returned array, and everything after it is also exposed on `positionals['--']`.

`createPositionalArguments()` does not mutate the input array.

## Comparison With Other Parsers

Choose _type-flag_ when you want a tiny parser whose schema returns the values your app actually uses.

```ts
const parsed = typeFlag({
    age: {
        type: Number,
        alias: 'a',
        default: 18
    }
})

parsed.flags.age // number
```

That one schema owns the app key, parser, alias, default, and TypeScript output. This is the main reason to choose _type-flag_: less post-processing, fewer raw option strings in app code, and a parsed result shaped like your application.

Where _type-flag_ shines:

- **App-ready values:** parser functions return numbers, dates, enums, objects, nullable values, or validated strings.
- **Readable schemas:** keep `type`, `alias`, and `default` next to the app key they configure.
- **TypeScript confidence:** bundled types infer `flags` from parser return types and defaults.
- **Forwarding wrappers:** known flags, unknown flags, positionals, and leftover argv stay easy to separate.
- **CLI-friendly naming:** camelCase schema keys accept kebab-case input like `--some-flag`.

How that compares:

| Alternative | Best fit | What _type-flag_ optimizes instead |
| --- | --- | --- |
| [`util.parseArgs()`](https://nodejs.org/api/util.html#utilparseargsconfig) | Built-in strict parsing when `string` and `boolean` values are enough. | Parser functions for app-native values like numbers, dates, enums, and validators. |
| [`arg`](https://github.com/vercel/arg) | Strict parser functions and bundled types with raw keys like `result['--port']`. | App-shaped schemas and output: `type`, `alias`, `default`, and `flags.port` stay together. |
| [`minimist`](https://github.com/minimistjs/minimist) | Quick permissive parsing for scripts where heuristic coercion is acceptable; TypeScript users rely on separate broad `@types/minimist` types. | Explicit schemas with bundled, schema-inferred TypeScript output. |
| Cleye, `commander`, `yargs`, `cac`, `meow` | Full CLI apps that need commands, help text, version flags, validation UX, or app structure. | Focused flag parsing that stays small and easy to embed. |

A few trade-offs are intentional:

- It does not parse POSIX-style short string values like `-ovalue`.
- It treats missing string values as `""`; strict parsers like `parseArgs()` and `arg` throw.
- For negative numeric values, use inline values like `--count=-1`; space-separated `--count -1` is parsed as a flag-like token today.

## Agent Skills

This package ships with a built-in [agent skill](https://agentskills.io) for AI coding assistants. Set up [`skills-npm`](https://github.com/antfu/skills-npm) in your project to use it.

## Sponsors

<p align="center">
	<a href="https://github.com/sponsors/privatenumber">
		<img src="https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg">
	</a>
</p>
