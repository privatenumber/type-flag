# type-flag <a href="https://npm.im/type-flag"><img src="https://badgen.net/npm/v/type-flag"></a>

Typed command-line arguments parser

### Features
- **Strongly typed** Parse argvs with confidence
- **Custom types & validation** Pass in any parser function and the flag type will be inferred
- **Array types** Accept multiple flag values
- **Configurable defaults** Set better defaults to avoid checking whether a flag was passed in
- **Tiny** 1.3 kB minified + gzipped


→ [Try it out online](https://stackblitz.com/edit/type-flag-demo?devtoolsheight=50&file=src/index.ts&view=editor)


> 🔥 Looking for something more robust?
>
> Checkout [_Cleye_](https://github.com/privatenumber/cleye), a CLI development tool powered by type-flag. It comes with argument parsing and a beautiful `--help` documentation generator.


<sub>Support this project by ⭐️ starring and sharing it. [Follow me](https://github.com/privatenumber) to see what other cool projects I'm working on! ❤️</sub>

## 🚀 Install

```bash
npm i type-flag
```

## 🚦 Quick start

Here's a simple example file `cli.ts`:
```ts
import typeFlag from 'type-flag'

// Pass in flag schemas and automatically parse process.argv!
const parsed = typeFlag({

    // Define flags here...

    someString: String,

    someBoolean: {
        type: Boolean,
        alias: 'b'
    },

    someNumber: {
        type: Number,
        alias: 'n',
        default: 2
    },

    // Wrap type with an array to accept multiple flags
    stringArray: [String],

    numberArray: {
        type: [Number]
    }
})

console.log(parsed.flags)
```

When you execute the file in the command-line, you can see the argvs parsed:
```sh
$ node ./cli --some-string 'hello' --some-boolean --some-number 3
> {
  someString: 'hello',
  someBoolean: true,
  someNumber: 3,
  stringArray: [],
  numberArray: []
}
```

`parsed` will have the following type:
```ts
type Parsed = {
    flags: {
        someString: string | undefined
        someBoolean: boolean
        someNumber: number
        stringArray: string[]
        numberArray: number[]
    }
    unknownFlags: {
        [flagName: string]: (string | boolean)[]
    }
    _: string[] & {
        '--': string[]
    }
}
```

## 🧑‍💻 Usage
### Defining flags
Pass in an object where the key is the flag name and the value is the flag type—a parser function that takes in a string and parses it to that type. Default JavaScript constructors should be able to cover most use-cases: [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/String), [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/Number), [Boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean/Boolean), etc.

The value can also be an object with the `type` property as the flag type.

```ts
typeFlag({
    // Short-hand: immediately set the type
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
To accept multiple values of a flag, use an array type by simply wrapping the type in an array:

```ts
const parsed = typeFlag({
    stringFlag: [String]
})
```

This allows usage like this:
```sh
$ node ./cli --string-flag A --string-flag B

# > parsed.flags.stringFlag = ['A', 'B']
```

#### Aliases
Flags are often given single-character aliases for shorthand usage (eg. `--help` to `-h`). To give a flag an alias, use the object syntax and set the `alias` property to a single-character name.

```ts
typeFlag({
    stringFlag: {
        type: String,
        alias: 's'
    }
})
```

This allows usage like this:
```sh
$ node ./cli -s A

# > parsed.flags.stringFlag = 'A'
```

#### Default values
Flags that are not passed in will default to being `undefined`. To set a different default value, use the object syntax and pass in a value as the `default` property. When a default is provided, the flag type will include that instead of `undefined`.

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
```sh
# These two map to the same flag
$ node ./cli --someString hello --some-string world
```

### Unknown flags
When unrecognized flags are passed in, they are either interpreted as a string or boolean depending on usage. Unknown flags are not converted to camelCase to allow for accurate error handling.

```sh
$ node ./cli --unknown-flag --unknown-flag 2
```

This outputs the following:
```json5
{
    unknownFlags: {
        'unknown-flag': [true, '2']
    },
    // ...
}
```

#### Ignoring unknown flags
Sometimes it may be undesirable to parse out unknown flags. For example, when an argument follows an unknown boolean flag, type-flag may assume that the argument was passed into the flag.

In these cases, you can ignore them so they're treated as arguments.

```ts
const parsed = typeFlag({}, {
    ignoreUnknown: true
})

// $ node ./cli --unknown hello
console.log(parsed._) // => ['--unknown', 'hello]
```


### Arguments
All argument values are stored in the `_` property.

Everything after `--` (end-of-flags) is treated as arguments and will be stored in the `_['--']` property.

```sh
$ node ./cli --boolean value --string "hello world" "another value" -- --string "goodbye world"
```

This outputs the following:
<!-- eslint-skip -->
```json5
{
    _: [
        'value',
        'another value',
        '--string',
        'goodbye world',
        '--': [
            '--string',
            'goodbye world'
        ]
    ]
    // ...
}
```

Note: `value` after `--boolean` is parsed as an argument because the boolean flag doesn't accept a value.

### Flag value delimiters
The characters `=`, `:` and `.` are reserved for delimiting the value from the flag.

```sh
$ node ./cli --flag=value --flag:value --flag.value
```

This allows for usage like `--flag:key=value` or `--flag.property=value` to be possible.

## 👨🏻‍🏫 Examples

### Custom flag type
Basic types can be set using [built-in functions in JavaScript](https://www.w3schools.com/js/js_object_constructors.asp#:~:text=Built-in%20JavaScript%20Constructors), but sometimes you want to a new type, narrow the type, or add validation.

To create a new type, simply declare a function that accepts a string argument and returns the parsed value with the expected type.

In this example, the `size` flag is enforced to be either `small`, `medium` or `large`.
```ts
const possibleSizes = ['small', 'medium', 'large'] as const

type Sizes = typeof possibleSizes[number]

function Size(size: Sizes) {
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
It's common to have flags that act as a boolean when no value is passed in. This can be done by creating a custom type that returns both types.

```ts
function OptionalString(value: string) {
    if (!value) {
        return true
    }

    return value
}

const parsed = typeFlag({
    optionalString: OptionalString
})
```

```ts
// $ node ./cli --optional-string
parsed.flags.optionalString // => true

// $ node ./cli --optional-string hello
parsed.flags.optionalString // => 'hello'
```

### Accepting flag values with `=` in it
In use-cases where flag values contain `=`, you can use `:` instead. This allows flags like `--define:K=V`.

```sh
$ node ./cli --define:key=value
```

```ts
const parsed = typeFlag({
    define: String
})

console.log(parsed.flags.define) // => 'key=value'
```

### Dot-nested flags
```sh
$ node ./cli --env.TOKEN=123 --env.CI
```

```ts
type Environment = {
    TOKEN?: string
    CI?: boolean
}

function EnvironmentObject(value: string): Environment {
    const [propertyName, propertyValue] = value.split('=')
    return {
        [propertyName]: propertyValue || true
    }
}

const parsed = typeFlag({
    env: [EnvironmentObject]
})

const environment = parsed.flags.env.reduce((agg, next) => Object.assign(agg, next), {})

console.log(environment) // { TOKEN: 123, CI: true }
```

### Inverting a boolean
To invert a boolean flag, `false` must be passed in with the `=` operator (or any other value delimiters).

```sh
$ node ./cli --boolean-flag=false
```

Note, without the `=`, the `false` will be parsed as a separate argument.

```sh
$ node ./cli --boolean-flag false
```

```json5
{
    flags: {
        booleanFlag: true
    },
    _: ['false']
}
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

console.log(parsed.flags.verbose.length)
```

```sh
$ node ./cli -vvv # logs 3
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
type TypeFunction = (argvValue: any) => any

type FlagSchema = {
    [flagName: string]: TypeFunction | [TypeFunction] | {
        type: TypeFunction | [TypeFunction]
        alias?: string
        default?: any
    }
}
```


An object containing flag schema definitions. Where the key is the flag name, and the value is either the type function or an object containing the type function and/or alias.

#### argv
Type: `string[]`

Default: `process.argv.slice(2)`

The argv array to parse.

#### options

Type:
```ts
type Options = {
    // Whether not to parse unknown flags (treat as arguments)
    ignoreUnknown?: boolean
}
```
