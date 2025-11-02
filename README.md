<p align="center">
	<img width="100" src=".github/logo.webp">
</p>
<h1 align="center">
	type-flag
	<br>
	<a href="https://npm.im/type-flag"><img src="https://badgen.net/npm/v/type-flag"></a> <a href="https://npm.im/type-flag"><img src="https://badgen.net/npm/dm/type-flag"></a>	
</h1>

Strongly typed command-line arguments parser.

No dependencies & tree-shakable (Max 1.4 kB).

→ [Try it out online](https://stackblitz.com/edit/type-flag-demo?devtoolsheight=50&file=src/type-flag.ts&view=editor)

> [!TIP]
> **Looking for something more robust? 👀**
>
> Try [**Cleye**](https://github.com/privatenumber/cleye)—a CLI development tool powered by _type-flag_.
>
> In addition to flag parsing, it supports argument parsing and has a beautiful `--help` documentation generator.

<p align="center">
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=398771"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/donate.webp"></a>
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=397608"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/sponsor.webp"></a>
</p>
<p align="center"><sup><i>Already a sponsor?</i> Join the discussion in the <a href="https://github.com/pvtnbr/tsx">Development repo</a>!</sup></p>

## 🚀 Install

```bash
npm i type-flag
```

### Import styles

```ts
// ESM
import { typeFlag, getFlag } from 'type-flag'

// CommonJS
const { typeFlag, getFlag } = require('type-flag')
```

### Why type-flag?

- **Zero dependencies**, **tree-shakable**, ~**1.4 kB**.
- **TypeScript-first**: schema → inferred types (no manual typings).
- **Predictable**: booleans don't swallow the next arg; explicit delimiters (`= : .`) for values.
- **Flexible**: custom parsers, alias groups (`-abc`), kebab↔camel mapping, unknown flags captured.

## 🚦 Quick start

Let's say you want to create a script with the following usage:
```
$ my-script --name John --age 20
```

### typeFlag

Here's how easy it is with _type-flag_:
```ts
import { typeFlag } from 'type-flag'

const parsed = typeFlag({
    name: String,
    age: {
        type: Number,
        alias: 'a'
    }
})

console.log(parsed.flags.name) // 'John'
console.log(parsed.flags.age) // 20
```

You can also get unknown flags and arguments from the `parsed` object:
```ts
// object of unknown flags passed in
console.log(parsed.unknownFlags)

// arguments
console.log(parsed._)
```

### getFlag

_Want something even simpler?_

_type-flag_ also exports a `getFlag` function that returns a single flag value.

```ts
import { getFlag } from 'type-flag'

const name = getFlag('--name', String)
const age = getFlag('-a, --age', Number)

console.log(name) // 'John'
console.log(age) // 20
```


These are quick demos but _type-flag_ can do so much more:
- Accept multiple flag values
- Flag operators (e.g. `=`) for explicitly passing in a value
- Parse unknown flags
- Parse alias groups (e.g. `-abc`)

Keep reading to learn more!

## 🧾 Cheat sheet

```ts
// Basic types
typeFlag({ name: String, age: Number, debug: Boolean })

// Arrays (repeatable flags)
typeFlag({ include: [String] }) // --include a --include b

// Aliases & groups
typeFlag({ verbose: { type: [Boolean], alias: 'v' } }) // -vvv

// Defaults
typeFlag({ level: { type: Number, default: 1 } })

// Custom type (validation)
const Port = (v: string) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error('Invalid port')
  return n
}
typeFlag({ port: Port })

// Unknown flags & args
const parsed = typeFlag({})
parsed.unknownFlags // { 'foo': [true, 'bar'] }
parsed._            // positionals
parsed._['--']      // args after the double dash
```

## 🧑‍💻 Usage
### Defining flags
Pass in an object where the key is the flag name and the value is the flag type—a parser function that takes in a string and parses it to that type. Default JavaScript constructors should be able to cover most use-cases: [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/String), [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/Number), [Boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean/Boolean), etc.

The value can also be an object with the `type` property as the flag type.

```ts
typeFlag({
    // Short-hand
    stringFlag: String,
    numberFlag: Number,
    booleanFlag: Boolean,

    // Object syntax:
    stringFlag: {
        type: String
    }
})
```

#### Array type
To accept multiple values of a flag, wrap the type with an array:

```ts
const parsed = typeFlag({
    myFlag: [String]
})

// $ node ./cli.js --my-flag A --my-flag B
parsed.flags.myFlag // => ['A', 'B']
```

#### Aliases
Flags are often given single-character aliases for shorthand usage (e.g., `--help` to `-h`). To give a flag an alias, use the object syntax and set the `alias` property to a single-character name.

```ts
typeFlag({
    myFlag: {
        type: String,
        alias: 'm'
    }
})

// $ node ./cli.js -m hello
parsed.flags.myFlag // => 'hello'
```

##### Alias groups
Multiple single-character aliases can be combined into an alias group. For example, `-abc` is equivalent to `-a -b -c`.

> [!NOTE]
> Only the **last** alias in a group can take a value; the value can be provided either as the **next token** or inline with an **`=`** in the same token.

```ts
const parsed = typeFlag({
    all: {
        type: Boolean,
        alias: 'a'
    },
    binary: {
        type: Boolean,
        alias: 'b'
    },
    color: {
        type: Boolean,
        alias: 'c'
    }
})

// $ node ./cli.js -abc
parsed.flags.all // => true
parsed.flags.binary // => true
parsed.flags.color // => true
```

If the last alias in the group accepts a value, it can be passed in as the next token or with `=`:
```ts
const parsed = typeFlag({
    all: {
        type: Boolean,
        alias: 'a'
    },
    binary: {
        type: Boolean,
        alias: 'b'
    },
    config: {
        type: String,
        alias: 'c'
    }
})

// $ node ./cli.js -abc path/to/config
parsed.flags.all // => true
parsed.flags.binary // => true
parsed.flags.config // => 'path/to/config'

// Or, with the value in the same token:
// $ node ./cli.js -abc=path/to/config
parsed.flags.config // => 'path/to/config'
```

#### Default values
Flags that are not passed in will default to being `undefined`. To set a different default value, use the object syntax and pass in a value as the `default` property. When a default is provided, the return type will reflect that instead of `undefined`.

When using mutable values (e.g., objects/arrays) as a default, pass in a function that creates it to avoid mutation-related bugs.

```ts
const parsed = typeFlag({
    someNumber: {
        type: Number,
        default: 1
    },

    manyNumbers: {
        type: [Number],

        // Use a function to return an object or array
        default: () => [1, 2, 3]
    }
})
```

To get `undefined` in the parsed flag type, make sure [`strict`](https://www.typescriptlang.org/tsconfig/#strict) or [`strictNullChecks`](https://www.typescriptlang.org/tsconfig#strictNullChecks) is enabled.

#### Boolean flags
Boolean flags don't consume the next argument—they're `true` when present without a value. To explicitly set `true` or `false`, use a delimiter (`=`, `:`, or `.`).

```ts
const parsed = typeFlag({
    verbose: Boolean,
    quiet: Boolean
})

// $ node ./cli.js --verbose --quiet false
parsed.flags.verbose // => true
parsed.flags.quiet // => true
parsed._ // => ['false']  // 'false' is treated as an argument, not a flag value

// To explicitly set false (recommended):
// $ node ./cli.js --verbose --quiet=false
parsed.flags.verbose // => true
parsed.flags.quiet // => false

// You can also set true explicitly if you want:
// $ node ./cli.js --verbose=true
parsed.flags.verbose // => true
```

> [!NOTE]
> To pass negative numbers (e.g., `--num=-3`) or literal strings beginning with `-`, use `=` so they're not mistaken for alias groups.

### kebab-case flags mapped to camelCase
When passing in the flags, they can be in kebab-case and will automatically map to the camelCase equivalent.
```ts
const parsed = typeFlag({
    someString: [String]
})

// $ node ./cli.js --someString hello --some-string world
parsed.flags.someString // => ['hello', 'world']
```

### Unknown flags
When unrecognized flags are passed in, they are interpreted as a boolean, or a string if explicitly passed in. Unknown flags are not converted to camelCase to allow for accurate error handling.

```ts
const parsed = typeFlag({})

// $ node ./cli.js --some-flag --some-flag=1234
parsed.unknownFlags // => { 'some-flag': [true, '1234'] }
```

### Arguments
Arguments are values passed in that are not associated with any flags. All arguments are stored in the `_` property.

Everything after `--` (end-of-flags) is treated as an argument (including flags) and will be stored in the `_['--']` property.

```ts
const parsed = typeFlag({
    myFlag: [String]
})

// $ node ./cli.js --my-flag value arg1 -- --my-flag world
parsed.flags.myFlag // => ['value']
parsed._ // => ['arg1', '--my-flag', 'world']
parsed._['--'] // => ['--my-flag', 'world']
```

### Flag value delimiters
The characters `=`, `:` and `.` are reserved for delimiting the value from the flag.

```sh
$ node ./cli.js --flag=value --flag:value --flag.value
```

This allows for usage like `--flag:key=value` or `--flag.property=value` to be possible.

### How argv is handled (immutability by default)

- By default, `typeFlag()` parses a **copy** of `process.argv.slice(2)`.
- If you **pass your own argv array**, `type-flag` will **mutate it** by removing:
  - parsed flags and their values
  - parsed positionals
  - unknown flags (unless ignored)
  - everything after `--` (also available at `_['--']`)

This makes it easy to **strip handled flags** and forward the rest to a child process.

```ts
const argv = ['--name', 'John', 'file.txt']
const parsed = typeFlag({ name: String }, argv)
argv // => ['file.txt']
```

#### Ignoring unknown flags
Sometimes it may be undesirable to parse unknown flags. In these cases, you can ignore them so they're left unparsed in the `argv` array.

```ts
const argv = process.argv.slice(2)
const parsed = typeFlag(
    {},
    argv,
    {
        ignore: type => type === 'unknown-flag'
    }
)

// $ node ./cli.js --unknown=hello
parsed._ // => []
argv // => ['--unknown=hello']
```

#### Ignoring everything after the first argument

Similarly to how Node.js only reads flags passed in before the first argument, _type-flag_ can be configured to ignore everything after the first argument.

```ts
const argv = process.argv.slice(2)

let stopParsing = false
const parsed = typeFlag(
    {
        myFlag: [Boolean]
    },
    argv,
    {
        ignore: (type) => {
            if (stopParsing) {
                return true
            }
            const isArgument = type === 'argument'
            if (isArgument) {
                stopParsing = isArgument
                return stopParsing
            }
        }
    }
)

// $ node ./cli.js --my-flag ./file.js --my-flag
parsed.flags.myFlag // => [true]
argv // => ['./file.js', '--my-flag']
```


## 👨🏻‍🏫 Examples

### Custom flag type
Basic types can be set using [built-in JavaScript constructors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#fundamental_objects), but sometimes you want to a new type, narrow the type, or add validation.

To create a new type, simply declare a function that accepts a string argument and returns the parsed value with the expected type.

In this example, the `size` flag is enforced to be either `small`, `medium` or `large`.
```ts
const possibleSizes = ['small', 'medium', 'large'] as const

type Sizes = typeof possibleSizes[number]

const Size = (size: Sizes) => {
    if (!possibleSizes.includes(size)) {
        throw new Error(`Invalid size: "${size}"`)
    }

    return size
}

const parsed = typeFlag({
    size: Size
})
```

`parsed` resolves to the following type:
```ts
type Parsed = {
    flags: {
        size: 'small' | 'medium' | 'large' | undefined
    }
    // ...
}
```

### Optional value flag

To create a string flag that acts as a boolean when nothing is passed in, create a custom type that returns both types.

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

// $ node ./cli.js --string
parsed.flags.string // => true

// $ node ./cli.js --string hello
parsed.flags.string // => 'hello'
```

### Accepting flag values with `=` in it
In use-cases where flag values contain `=`, you can use `:` instead. This allows flags like `--define:K=V`.

```ts
const parsed = typeFlag({
    define: String
})

// $ node ./cli.js --define:key=value
parsed.flags.define // => 'key=value'
```

### Dot-nested flags
```ts
type Environment = {
    TOKEN?: string
    CI?: boolean
}

const EnvironmentObject = (value: string): Environment => {
    const [propertyName, propertyValue] = value.split('=')
    return {
        [propertyName]: propertyValue || true
    }
}

const parsed = typeFlag({
    env: [EnvironmentObject]
})

const env = parsed.flags.env.reduce(
    (agg, next) => Object.assign(agg, next),
    {}
)

// $ node ./cli.js --env.TOKEN=123 --env.CI
env // => { TOKEN: 123, CI: true }
```

### Counting flags
To create an API where passing in a flag multiple times increases a count (a pretty common one is `-vvv`), you can use an array-boolean type and count the size of the array:

```ts
const parsed = typeFlag({
    verbose: {
        type: [Boolean],
        alias: 'v'
    }
})

// $ node ./cli.js -vvv
parsed.flags.verbose.length // => 3
```

## 🍳 Common recipes

### Required flags (beginner-friendly)
Option A (validate after parse):
```ts
const parsed = typeFlag({ token: String })
if (!parsed.flags.token) {
  console.error('Missing --token'); process.exit(1)
}
```

Option B (make it impossible to pass empty/invalid):
```ts
const NonEmptyString = (v: string) => {
  if (!v) throw new Error('Expected a value'); return v
}
const parsed = typeFlag({ token: NonEmptyString })
```

### Print a simple --help

```ts
const schema = {
  help: { type: Boolean, alias: 'h' },
  out: { type: String, alias: 'o', default: 'dist' },
}
const parsed = typeFlag(schema)

if (parsed.flags.help) {
  console.log(`
Usage: mytool [options] [--] [args...]

Options:
  -h, --help            Show help
  -o, --out <dir>       Output directory (default: "${parsed.flags.out}")
  --debug               Enable debug mode
  `)
  process.exit(0)
}
```

### Migrate from minimist/arg/parseArgs quickly

```ts
// minimist: { boolean: ['debug'], string: ['name'], alias: { o: 'out' } }
typeFlag({
  debug: Boolean,
  name: String,
  out: { type: String, alias: 'o' },
})

// arg: { '--out': String, '-o': '--out', '--flag': Boolean }
typeFlag({
  out: { type: String, alias: 'o' },
  flag: Boolean,
})

// parseArgs({ options: { port: { type: 'string', short: 'p' } } })
typeFlag({
  port: { type: Number, alias: 'p' },
})
```

### Read environment maps (`--env.KEY=value`)

```ts
type Env = Record<string, string | boolean>
const EnvEntry = (v: string): Env => {
  const [k, val] = v.split('=')
  return { [k]: val ?? true }
}
const parsed = typeFlag({ env: [EnvEntry] })
// fold into one object:
const env = parsed.flags.env.reduce((acc, e) => Object.assign(acc, e), {} as Env)
```

### "Optional string or boolean"

```ts
const OptionalString = (v: string) => (v ? v : true)
typeFlag({ mode: OptionalString }) // --mode or --mode=prod
```

## ⚙️ API

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
    _: string[]
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
        default?: unknown
    }
}
```


An object containing flag schema definitions. Where the key is the flag name, and the value is either the type function or an object containing the type function and/or alias.

#### argv
Type: `string[]`

Default: `process.argv.slice(2)`

The argv array to parse. The array is mutated to remove the parsed flags.

#### options

Type:
```ts
type Options = {
    // Callback to skip parsing on certain argv tokens
    ignore?: (
        type: 'known-flag' | 'unknown-flag' | 'argument',
        flagOrArgv: string,
        value: string | undefined
    ) => boolean | void
}
```

---

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

The argv array to parse. The array is mutated to remove the parsed flags.

---

## TypeScript types

_type-flag_ exports TypeScript types for defining and typing flag schemas:

### `Flags`
Type for defining a flag schema. Useful for creating reusable flag definitions or when you want to separate the schema definition from usage.

```ts
import type { Flags } from 'type-flag'

const flags: Flags = {
    name: String,
    age: {
        type: Number,
        alias: 'a'
    }
}

const parsed = typeFlag(flags)
```

You can extend `Flags` with custom properties for adding metadata like descriptions:

```ts
import type { Flags } from 'type-flag'

type FlagsWithDescription = Flags<{
    description: string
}>


const flags: FlagsWithDescription = {
    name: {
        type: String,
        description: 'Your name'
    },
    age: {
        type: Number,
        alias: 'a',
        description: 'Your age'
    }
}
```

### `TypeFlag`
The return type of `typeFlag()`. This is automatically inferred, but can be useful for typing functions that accept parsed results.

```ts
import type { TypeFlag } from 'type-flag'

type ParsedFlags = TypeFlag<typeof flags>

function processFlags(parsed: ParsedFlags) {
    // ...
}
```

> [!TIP]
> Type inference means you rarely need to import these types—they're mainly useful for library authors or meta tooling.

## ❓ FAQ & Troubleshooting

**Q: Why is `--num -3` not giving me -3?**
Because `-3` looks like an alias group (`-3`) to a parser. Use an explicit delimiter: `--num=-3`.

**Q: My boolean ate the next argument.**
By design, booleans **do not** consume the next token. `--flag value` → `flag = true` and `value` becomes a positional. To set `false`, use `--flag=false`.

**Q: How do I pass values with spaces?**
Use your shell's quoting: `--name "John Smith"`.

**Q: Why are some flags in camelCase and some in kebab-case?**
You define in camelCase; the CLI accepts both. `someString` and `--some-string` map to the same flag.

**Q: Can I capture args after `--`?**
Yes: they appear in `parsed._['--']`.

**Q: Does this work in CommonJS?**
Yes—see the "Import styles" section.

**Q: Can I keep all unknown flags for later?**
Yes: `parsed.unknownFlags` gives you a record of unknowns and their values.

## Sponsors
<p align="center">
	<a href="https://github.com/sponsors/privatenumber">
		<img src="https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg">
	</a>
</p>
