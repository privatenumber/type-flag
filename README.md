# type-flag <a href="https://npm.im/type-flag"><img src="https://badgen.net/npm/v/type-flag"></a> <a href="https://npm.im/type-flag"><img src="https://badgen.net/npm/dm/type-flag"></a> <a href="https://packagephobia.now.sh/result?p=type-flag"><img src="https://packagephobia.now.sh/badge?p=type-flag"></a>

CLI argument parser with first-class type support.

### Features
- **Strongly typed** Apply types to parsed argvs!
- **Custom types & validation** Pass in any function and the type will be inferred!
- **Tiny** 2.7 kB minified!

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

    // Wrap type with an array to indicate accept multiple flags
    stringArray: [String],

    numberArray: {
        type: [Number]
    }
})

console.log(parsed.flags);
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

`parsed` has the following type:
```ts
{
    flags: {
        someString: string | undefined;
        someBoolean: boolean;
        someNumber: number;
        stringArray: string[];
        numberArray: number[];
    };
    unknownFlags: {
        [flagName: string]: (string | boolean)[];
    };
    _: string[];
}
```

## 🧑‍💻 Usage

### Default values
Set a default value with the `default` property. When a default is provided, the flag type will include that instead of `undefined`.

When using mutable values (eg. objects/arrays) as a default, pass in a function that creates it to avoid mutation-related bugs.

```ts
const parsed = typeFlag({
    someNumber: {
        type: Number,
        default: 1
    },

    manyNumbers: {
        type: [Number],
        default: () => [1, 2, 3]
    }
})
```

### kebab-case flags mapped to camelCase
When passing in the flags, they can be in kebab-case and will automatically map to the camelCase equivalent.
```sh
$ node ./cli --someString hello --some-string world
```

### Unknown flags
When unrecognized flags are passed in, they are either interpreted as a string or boolean depending on usage.

Note, unknown flags are not converted to camelCase.

```sh
$ node ./cli --unknown-flag --unknown-flag 2
```

This outputs the following:
```ts
{
	unknownFlags: {
		'unknown-flag': [true, '2']
	},
	...
}
```

### Arguments
All argument values are passed into the `_` property.

Notice how the "`value"` is parsed as an argument because the boolean flag doesn't accept a value.

Arguments after `--` will not be parsed.

```sh
$ node ./cli --boolean value --string "hello world" "another value" -- --string "goodbye world"
```

This outputs the following:
```ts
{
	_: ['value', 'another value', '--string', 'goodbye world']
	...
}
```

### Flag value delimiters
The characters `=`, `:` and `.` are reserved for delimiting the value from the flag.

```sh
$ node ./cli --flag=value --flag:value --flag.value
```

This allows for usage like `--flag:key=value` or `--flag.property=value` to be possible.

## 👨🏻‍🏫 Examples

### Using a custom type
Basic types can be set using [built-in functions in JavaScript](https://www.w3schools.com/js/js_object_constructors.asp#:~:text=Built-in%20JavaScript%20Constructors), but sometimes you want to a new type, narrow the type, or add validation.

To create a new type, simply declare a function that accepts a string argument and returns the parsed value with the expected type.

In this example, the `size` flag is enforced to be either `small`, `medium` or `large`.
```ts
const possibleSizes = ['small', 'medium', 'large'] as const;

type Sizes = typeof possibleSizes[number];

function Size(size: Sizes) {
    if (!possibleSizes.includes(size)) {
        throw new Error(`Invalid size: "${size}"`);
    }

    return size;
};

const parsed = typeFlag({
    size: Size
})
```

`parsed` resolves to the following type:
```ts
const parsed: {
    flags: {
        size: Sizes | undefined;
    };
    ...
}
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
type Env = {
	TOKEN?: string;
	CI?: boolean;
};

function EnvObject(value: string): Env {
	const [propertyName, propertyValue] = value.split('=');
	return {
		[propertyName]: propertyValue || true,
	};
}

const parsed = typeFlag({
	env: [EnvObject],
});

const env = parsed.flags.env.reduce((agg, next) => Object.assign(agg, next), {});

console.log(env); // { TOKEN: 123, CI: true }
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

```ts
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
		alias: 'v',
	},
});

console.log(parsed.flags.verbose.length);
```

```sh
$ node ./cli -vvv # logs 3
```

## ⚙️ API

### typeFlag(flagSchema, argv?)

Returns an object with the shape:
```ts
{
    flags: {
        [flagName: string]: InferredType;
    };
    unknownFlags: {
        [flagName: string]: (string | boolean)[];
    };
    _: string[];
}
```

#### flagSchema
Type:
```ts
type TypeFunction = (argvValue: any) => any;

type FlagSchema = {
    [flagName: string]: TypeFunction | [TypeFunction] | {
        type: TypeFunction | [TypeFunction];
        alias?: string;
        default?: any;
    };
};
```


An object containing flag schema definitions. Where the key is the flag name, and the value is either the type function or an object containing the type function and/or alias.

#### argv
Type: `string[]`

Default: `process.argv.slice(2)`

The argv array to parse.
