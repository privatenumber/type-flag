---
name: type-flag
description: "Use when working with type-flag or building CLIs on top of it (e.g. cleye). Strongly-typed Node.js argv parser: schema syntax (String/Number/Boolean, arrays, custom parser functions, Standard Schema validators like Zod/Valibot/ArkType, aliases, defaults, single-char names), return shape (flags/unknownFlags/positional args), flag forms (long/short/grouping, =/:/. delimiters, kebab/camelCase), boolean negation via `--no-`, and the `ignore` callback for multi-command dispatch."
---

# type-flag

## Quick start

```ts
import { typeFlag } from 'type-flag'

const parsed = typeFlag({
    name: String,
    age: { type: Number, alias: 'a' },
})

// $ my-cli --name John -a 20
parsed.flags.name   // 'John'
parsed.flags.age    // 20
parsed.unknownFlags // {}
parsed._            // []  (positional args, with _['--'] for post-`--`)
```

## Schema

| Form | Example | Meaning |
|------|---------|---------|
| Shorthand | `flag: String` | Type only |
| Object | `flag: { type: String, alias: 'f', default: 'x' }` | Type + options |
| Array | `flag: [String]` or `{ type: [String] }` | Collect multiple values |
| Custom parser | `flag: (raw: string) => MyType` | Any `(string) => T` (see below) |
| Standard Schema | `flag: z.enum([...])` / `[z.string()]` | Validate via a Zod/Valibot/ArkType schema (see below) |
| Single-char name | `x: Number` | Matches `-x`, NOT `--x` |

Type options:

| Option | Type | Notes |
|--------|------|-------|
| `type` | `TypeFunction \| [TypeFunction]` | Parser; wrap in `[]` for arrays |
| `alias` | `string` (1 char) | Forbidden when flag name is 1 char |
| `default` | `T \| (() => T)` | Use a function for mutable defaults (objects/arrays) |

## Custom parsers & Standard Schema

A flag type is any `(value: string) => T`; the return type becomes the flag type. Use it to validate, narrow, or transform:

```ts
const Size = (value: string) => {
    if (value !== 'small' && value !== 'large') {
        throw new Error(`Invalid size: ${value}`)
    }
    return value as 'small' | 'large'
}

typeFlag({ size: Size }) // flags.size: 'small' | 'large' | undefined
```

Or pass a **Standard Schema** (Zod, Valibot, ArkType) directly — type-flag validates it and infers the flag type from the schema's output, no wrapper:

```ts
typeFlag({
    size: z.enum(['small', 'large']), // 'small' | 'large' | undefined
    port: z.coerce.number(),          // number | undefined
    tags: [z.string()],               // string[]
})
```

- Multiple values: wrap in `[schema]`, NOT `z.array(...)` (it validates a single token and throws).
- Numbers: CLI values are strings, so coerce (`z.coerce.number()`).
- Booleans: keep native `Boolean` (a schema loses `--no-` negation and short grouping).
- Sync only: async schemas throw. A failed schema or parser propagates the raw error.

## Return shape

```ts
{
    flags:        { [name]: InferredType },
    unknownFlags: { [name]: (string | boolean)[] },  // not camelCased
    _:            string[] & { '--': string[] },      // positional; everything after `--` also in `_['--']`
}
```

## Flag forms

| Input | Behavior |
|-------|----------|
| `--flag value` / `--flag=value` | Long form |
| `-f value` / `-f=value` | Short form (alias or single-char name) |
| `-abc` | Group: each char matches an alias or single-char name independently |
| `--some-flag` | kebab-case → camelCase (`someFlag`) unless schema key is kebab |
| `--flag:value` / `--flag.value` | `:` and `.` also delimit values (useful for `--define:K=V`, `--env.KEY=V`) |
| `-xvalue` (concatenated) | ⚠️ Parsed as GROUP, not `x=value`. Use `-x value` or `-x=value`. |

## Single-char flag names vs aliases

Both produce short flags that group identically (`-ab`, `-av`, mixed — all work). The difference is OUTPUT placement:

| Pattern | When | Example |
|---------|------|---------|
| Single-char name (`{ x: Number }`) | Short form IS the flag (coordinates, `-h`/`--help` as distinct entries) | Key lands in `flags.x` |
| Alias (`{ verbose: { alias: 'v' } }`) | `--verbose` and `-v` should set the same value | Both forms feed `flags.verbose` |

Single-char names match `-x` but NOT `--x` — this preserves schemas like `{ h: Boolean, help: Boolean }` where `-h` and `--help` must stay distinct (`rg`-style short-vs-long help).

## Boolean negation (opt-in)

```ts
typeFlag({ verbose: Boolean }, argv, { booleanNegation: true })
// --no-verbose  → flags.verbose = false
// --verbose --no-verbose → false (last wins)
```

Only affects `Boolean`-typed, schema-known flags. `--no-X` for non-boolean or unknown falls through to `unknownFlags`.

Explicit `=false` always works regardless of `booleanNegation`:
```ts
// --verbose=false → flags.verbose = false
// --verbose false → flags.verbose = true, `_` = ['false']  (space-separated is positional)
```

## `ignore` callback

Skip parsing specific tokens (leave them in `argv`). Called for each token:

```ts
ignore?: (
    type: 'known-flag' | 'unknown-flag' | 'argument',
    flagOrArgv: string,
    value: string | undefined,
) => boolean | void
```

Two common patterns:

```ts
// 1. Leave unknown flags in argv (e.g. forward to child process)
typeFlag({}, argv, { ignore: type => type === 'unknown-flag' })

// 2. Stop parsing at first positional (Node-style subcommand dispatch)
let stop = false
typeFlag(schema, argv, {
    ignore: (type) => {
        if (stop) return true
        if (type === 'argument') { stop = true; return true }
    },
})
```

`argv` is mutated: type-flag removes parsed tokens. Pass `process.argv.slice(2)` (or a copy) to see what's left.

## `getFlag` — one-off extraction

```ts
import { getFlag } from 'type-flag'

const name = getFlag('--name', String)          // single value
const age  = getFlag('-a,--age', Number)        // comma-separated names
const tags = getFlag('-t,--tag', [String])      // array form collects all
```

Same argv-mutation behavior as `typeFlag`.

## Gotchas

| Gotcha | Detail |
|--------|--------|
| Negative numbers look like flag groups | `--num -123` is parsed as `-1 -2 -3` (char group). Use `--num=-123` or `--num=-Inf`. |
| `argv` is mutated | Parsed tokens are spliced out. Don't share argv with other parsers after. |
| Frozen argv throws | `Object.freeze(argv)` breaks the splice. Pass a mutable copy. |
| `unknownFlags` keys are raw | NOT camelCased — so you can distinguish `--some-flag` from `--someFlag`. |
| Reserved chars in names | `\s`, `.`, `:`, `=` forbidden in flag names (they're delimiters). |
| kebab schema key | If schema key is `'some-flag'`, only `--some-flag` / `--someFlag` both map to it, but output key stays kebab. |
| Default functions throw | A throwing `default: () => ...` propagates. |
| Parser/schema errors propagate raw | A throwing parser or failed schema surfaces its own error message (no flag-name wrapping). |

## Related

For full CLI framework with help generation and subcommands, see [cleye](https://github.com/privatenumber/cleye) (built on type-flag).
