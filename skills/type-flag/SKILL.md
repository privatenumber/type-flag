---
name: type-flag
description: "Use when working with type-flag or building CLIs on top of it (e.g. cleye). Strongly-typed Node.js argv parser: schema syntax (String/Number/Boolean, arrays, custom parser functions, Standard Schema validators like Zod/Valibot/ArkType, aliases, defaults, single-char names), return shape (flags/unknownFlags/positional args, plus the advanced ordered `entries` stream), flag forms (long/short/grouping, =/:/. delimiters, kebab/camelCase), boolean negation via `--no-`, and the `ignore` callback for multi-command dispatch."
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

Names start with a Unicode letter, Unicode number, or `_` and cannot contain whitespace, `=`, `:`, or `.`. Aliases are one UTF-16 code unit from the same starting class, such as `é` or `5`.

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
- Sync only: async schemas throw. A failed schema throws `FlagParseError` as `Flag "<flag>": <message>` (original on `.cause`).

## Return shape

```ts
{
    flags:        { [name]: InferredType },          // null-prototype object
    unknownFlags: { [name]: (string | boolean)[] },  // null-prototype object; not camelCased
    _:            string[] & { '--': string[] },      // positional; everything after `--` also in `_['--']`
    entries:      ParsedArgvEntry[],                  // advanced; see below
}
```

`flags` and `unknownFlags` are null-prototype objects. Use `name in flags` or `Object.hasOwn(flags, name)`.

### `entries` (advanced)

Ordered stream of every interpreted argv element, preserving relative order across different flags (which `flags` discards by grouping per name). Most CLIs ignore this; use it when order across flags matters (e.g. curl `-d`/`--data-urlencode` body assembly).

```ts
type ParsedArgvEntry =
    | { type: 'flag'; name: string; value: unknown }          // name = canonical schema key (alias/kebab resolved)
    | { type: 'unknown-flag'; name: string; value: string | boolean } // name = raw argv name
    | { type: 'argument'; value: string }
```

`-d a --data-urlencode b -d c` → three `flag` items in argv order, each `name` being the canonical schema key. Ignored elements (via `ignore`) are excluded. Tokens after `--` are not parsed, so they don't appear here (use `_['--']`).

## Flag forms

| Input | Behavior |
|-------|----------|
| `--flag value` / `--flag=value` | Long form |
| `-f value` / `-f=value` | Short form (alias or single-char name) |
| `-abc` | Group: each character is a flag until a defined value-taking flag consumes the remainder |
| `--some-flag` | kebab-case → camelCase (`someFlag`) unless schema key is kebab; consecutive capitals treated as one unit (`getID` → `--get-id`, `URLParser` → `--url-parser`) |
| `--flag:value` / `--flag.value` | `:` and `.` also delimit values (useful for `--define:K=V`, `--env.KEY=V`) |
| `-xvalue` (concatenated) | If `x` takes a value, parses as `x=value`; otherwise continues as a group |

## Single-char flag names vs aliases

Both produce short flags that group identically. A defined non-Boolean flag takes the rest of the token as its value and ends the group: `-vnfoo` gives `v` and `n=foo`. Strip one leading `=`, `:`, or `.` from that value. If nothing follows the flag, it takes the next argument, if present, unless it is `--` or a flag-shaped token; a dash-number such as `-5` is a value unless every character after the dash is a defined flag. With `n: String`, `['-n', '--verbose']` gives `n: ''`. Long flags need `--`: with a string alias `o`, `-output` gives `o` the value `utput`. The difference is OUTPUT placement:

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

`--no-X=value` is unknown unless `no-X` is itself defined; defined flags take precedence over negation.

Explicit `=false` always works regardless of `booleanNegation`:

Explicit Boolean values, including `[Boolean]`, accept only case-sensitive `true` and `false`. Other values, including empty values, throw `FlagParseError` in both APIs. This applies to `=`, `:`, `.`, and grouped short aliases. A separate following token is never the Boolean's value: `--verbose false` leaves `false` as a positional in `typeFlag` and in argv for `getFlag`.
```ts
// --verbose=false → flags.verbose = false
// --verbose false → flags.verbose = true, `_` = ['false']  (space-separated is positional)
```

## `ignore` callback

Skip parsing specific tokens (leave them in `argv`). An ignored defined value-taking flag also leaves its following value in `argv` without calling `ignore` for that value. For unknown flags, use `--flag=value` when forwarding values: a separate following token is parsed on its own, usually as an argument. Called for each flag and each positional argument before `--`, but not for a flag's value token. `--` gets one `'argument'` call with `'--'`, which covers the whole tail after it:

```ts
ignore?: (
    type: 'flag' | 'unknown-flag' | 'argument',
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

When forwarding to another parser, do not group an extracted short flag with flags the other parser will read. An unknown `-nvalue` can lose the `v` when extracting `-v`, because the wrapper cannot know `n` takes a value. Pass the other parser's value with a long flag with an attached value, such as `--name=value`, which the wrapper never rewrites. A separate value (`-n value`) is safe only when it does not start with `-`: extracting `-e` from `['-n', '-5e3']` leaves `['-n', '-53']` (`-n=value` is parser-dependent: Node's `util.parseArgs` and commander read it as `=value`); with `ignore`, preserve the separate value argument too. Extraction removes a known value-taking flag and its attached value; ignored flags keep theirs. A remainder of exactly `--` is removed to avoid hiding the rest of argv; all other remainders stay in order. A remainder can become a long flag (`-q-abc` becomes `--abc`), a positional (`-q?` becomes `-?`), or a dash-number value candidate (`-q5x` becomes `-5x`). A preceding type-flag value-taking flag consumes `-5x` unless both `5` and `x` are defined flags. Which flag takes the next token also depends on the next parser. Extracting `-q` from `-q-=value` leaves `--=value`: type-flag treats it as a positional, but Node's `util.parseArgs` reads it as an unknown long option named `=value`.

## `getFlag` — one-off extraction

```ts
import { getFlag } from 'type-flag'

const name = getFlag('--name', String)          // single value
const age  = getFlag('-a,--age', Number)        // comma-separated names
const tags = getFlag('-t,--tag', [String])      // array form collects all
```

Scalar parsers return the last match; array parsers return all matches. Every match is removed from argv. Names are comma-separated and whitespace-trimmed: a short name is one dash followed by one UTF-16 code unit that is a Unicode letter, Unicode number, or `_`; a long name is two dashes followed by a name that starts with that class and spans at least two UTF-16 code units, without whitespace, `=`, `:`, or `.`. One supplementary character, such as `𐐀`, qualifies as a long name. Short and long forms match only their respective argv forms. Invalid names throw an `Error`.

## Gotchas

| Gotcha | Detail |
|--------|--------|
| Negative numbers as values | A token that starts with `-` and a digit (`--num -5`, `--range -5..10`, `--delta -5%`) is taken as the flag's value. Value-slot only: a standalone `-5`, or a token whose characters are all defined flags, still parses as flags. `-Infinity`/`-NaN` (no leading digit) need `--num=-Infinity`. |
| `argv` is mutated | Parsed tokens are removed in place. See the forwarding caveats above before sharing argv with another parser. |
| Frozen argv throws | `Object.freeze(argv)` breaks the splice. Pass a mutable copy. |
| `unknownFlags` keys are raw | NOT camelCased — so you can distinguish `--some-flag` from `--someFlag`. |
| Reserved chars in names | `\s`, `.`, `:`, `=` forbidden in flag names (they're delimiters). |
| kebab schema key | If schema key is `'some-flag'`, only `--some-flag` / `--someFlag` both map to it, but output key stays kebab. |
| Default functions throw | A throwing `default: () => ...` propagates raw (NOT a `FlagParseError`). |
| Parser/schema errors wrap | `FlagParseError` extends `TypeError` and preserves the original on `.cause`. For `typeFlag`, `.flagName` is the schema key and the message uses its kebab-case long spelling, or the short spelling for a single-character key. For `getFlag`, `.flagName` is the first long search name, or the first short name if no long name exists; the message uses that search name with dashes. |

## Related

For full CLI framework with help generation and subcommands, see [cleye](https://github.com/privatenumber/cleye) (built on type-flag).
