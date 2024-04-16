<p align="center">
	<img width="100" src=".github/logo.webp">
</p>
<h1 align="center">
	type-flag
	<br>
	<a href="https://npm.im/type-flag"><img src="https://badgen.net/npm/v/type-flag"></a> <a href="https://npm.im/type-flag"><img src="https://badgen.net/npm/dm/type-flag"></a>	
</h1>

Strongly typed command-line arguments parser. Tree-shakable (Max 1.4 kB)

→ [Try it out online](https://stackblitz.com/edit/type-flag-demo?devtoolsheight=50&file=src/type-flag.ts&view=editor)
</div>



> [!TIP]
> **Looking for something more robust? 👀**
>
> Try [**Cleye**](https://github.com/privatenumber/cleye)—a CLI development tool powered by _type-flag_.
>
> In addition to flag parsing, it supports argument parsing and has a beautiful `--help` documentation generator.

<p align="center">
	<a href="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum">
		<picture>
			<source width="830" media="(prefers-color-scheme: dark)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum&image=dark">
			<source width="830" media="(prefers-color-scheme: light)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum&image">
			<img width="830" src="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum&image" alt="Premium sponsor banner">
		</picture>
	</a>
</p>

## 🚀 Install

```bash
npm i type-flag
```

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
const age = getFlag('-a,--age', Number)

console.log(name) // 'John'
console.log(age) // 20
```


These are quick demos but _type-flag_ can do so much more:
- Accept multiple flag values
- Flag operators (e.g. `=`) for explicitly passing in a value
- Parse unknown flags
- Parse alias groups (e.g. `-abc`)

Keep reading to learn more!

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

// $ node ./cli --my-flag A --my-flag B
parsed.flags.myFlag // => ['A', 'B']
```

#### Aliases
Flags are often given single-character aliases for shorthand usage (eg. `--help` to `-h`). To give a flag an alias, use the object syntax and set the `alias` property to a single-character name.

```ts
typeFlag({
    myFlag: {
        type: String,
        alias: 'm'
    }
})

// $ node ./cli -m hello
parsed.flags.myFlag // => 'hello'
```

#### Default values
Flags that are not passed in will default to being `undefined`. To set a different default value, use the object syntax and pass in a value as the `default` property. When a default is provided, the return type will reflect that instead of `undefined`.

When using mutable values (eg. objects/arrays) as a default, pass in a function that creates it to avoid mutation-related bugs.

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

### kebab-case flags mapped to camelCase
When passing in the flags, they can be in kebab-case and will automatically map to the camelCase equivalent.
```ts
const parsed = typeFlag({
    someString: [String]
})

// $ node ./cli --someString hello --some-string world
parsed.flags.someString // => ['hello', 'world']
```

### Unknown flags
When unrecognized flags are passed in, they are interpreted as a boolean, or a string if explicitly passed in. Unknown flags are not converted to camelCase to allow for accurate error handling.

```ts
const parsed = typeFlag({})

// $ node ./cli --some-flag --some-flag=1234
parsed.unknownFlags // => { 'some-flag': [true, '1234'] }
```

### Arguments
Arguments are values passed in that are not associated with any flags. All arguments are stored in the `_` property.

Everything after `--` (end-of-flags) is treated as an argument (including flags) and will be stored in the `_['--']` property.

```ts
const parsed = typeFlag({
    myFlag: [String]
})

// $ node ./cli --my-flag value arg1 -- --my-flag world
parsed.flags.myFlag // => ['value']
parsed._ // => ['arg1', '--my-flag', 'world']
parsed._['--'] // => ['--my-flag', 'world']
```

### Flag value delimiters
The characters `=`, `:` and `.` are reserved for delimiting the value from the flag.

```sh
$ node ./cli --flag=value --flag:value --flag.value
```

This allows for usage like `--flag:key=value` or `--flag.property=value` to be possible.

### Mutated argv array

When `type-flag` iterates over the argv array, it removes the tokens it parses out via mutation.

By default, `type-flag` works on a new copy of `process.argv.slice(2)` so this doesn't have any side-effects. But if you want to leverage this behavior to extract certain flags and arguments, you can pass in your own copy of `process.argv.slice(2)`.

This may be useful for filtering out certain flags before passing down the `argv` to a child process.

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

// $ node ./cli --unknown=hello
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

// $ node ./cli --my-flag ./file.js --my-flag
parsed.flags.myFlag // => [true]
argv // => ['./file.js', '--my-flag']
```


## 👨🏻‍🏫 Examples

### Custom flag type
Basic types can be set using [built-in functions in JavaScript](https://www.w3schools.com/js/js_object_constructors.asp#:~:text=Built-in%20JavaScript%20Constructors), but sometimes you want to a new type, narrow the type, or add validation.

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

// $ node ./cli --string
parsed.flags.string // => true

// $ node ./cli --string hello
parsed.flags.string // => 'hello'
```

### Accepting flag values with `=` in it
In use-cases where flag values contain `=`, you can use `:` instead. This allows flags like `--define:K=V`.

```ts
const parsed = typeFlag({
    define: String
})

// $ node ./cli --define:key=value
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

// $ node ./cli --env.TOKEN=123 --env.CI
env // => { TOKEN: 123, CI: true }
```

### Inverting a boolean
To invert a boolean flag, `false` must be passed in with the `=` operator (or any other value delimiters).


```ts
const parsed = typeFlag({
    booleanFlag: Boolean
})

// $ node ./cli --boolean-flag=false
parsed.flags.booleanFlag // => false
```

Without explicitly specfying the flag value via `=`, the `false` will be parsed as a separate argument.

```ts
// $ node ./cli --boolean-flag false
parsed.flags.booleanFlag // => true
parsed._ // => ['false']
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

// $ node ./cli -vvv
parsed.flags.verbose.length // => 3
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
        value: string | undefined,
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


## Sponsors
<p align="center">
	<a href="https://github.com/sponsors/privatenumber">
		<img src="https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg">
	</a>
</p>
