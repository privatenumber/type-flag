# type-flag <a href="https://npm.im/type-flag"><img src="https://badgen.net/npm/v/type-flag"></a> <a href="https://npm.im/type-flag"><img src="https://badgen.net/npm/dm/type-flag"></a> <a href="https://packagephobia.now.sh/result?p=type-flag"><img src="https://packagephobia.now.sh/badge?p=type-flag"></a>

Parse CLI argv flags with first-class type support. Think [minimist](https://github.com/substack/minimist), but typed!

### Features
- ⚡️ Typed flags
- 🎨 Custom types
- 🎭 Alias support
- 🐣 Tiny

<sub>Support this project by ⭐️ starring and sharing it. [Follow me](https://github.com/privatenumber) to see what other cool projects I'm working on! ❤️</sub>

## 🚀 Install

```bash
npm i type-flag
```

## 🚦 Quick usage

_cli.ts_
```ts
import typeFlag from 'type-flag'

const parsed = typeFlag(process.argv.slice(2), {

    // Define flags here...

    someString: String,

    someNumber: {
        type: Number,
        alias: 'n' // Set an alias (eg. -n <number>)
    },

    someBoolean: {
        type: Boolean,
        alias: 'b'
    }
})
```

`parsed` resolves to the following type:
```ts
{
    flags: {
        someString: string[];
        someNumber: boolean[];
        someBoolean: number[];
    };
    unknownFlags: {
        [flagName: string]: (string | boolean)[];
    };
    '--': string[];
}
```

When passing in the flags, they can be in kebab-case and will automatically map to the camelCase equivalent.
```sh
$ node ./cli --some-string hello --number=3 --someBoolean
```

## 👨🏻‍🏫 Examples

### Using a custom type
Basic types can be set using [built-in functions in JavaScript](https://www.w3schools.com/js/js_object_constructors.asp#:~:text=Built-in%20JavaScript%20Constructors), but sometimes you want to a new type, narrow the type, or even add validation.

To create a new type, simply declare a function that accepts a string argument and returns the parsed value with the expected type.

In this example, the `format` flag is enforced to be either `cjs` or `esm`.
```ts
const possibleJsFormats = ['cjs', 'esm'] as const;

type JsFormats = typeof possibleJsFormats[number];

const JsFormat = (format: JsFormats) => {
    if (!possibleJsFormats.includes(format)) {
        throw new Error(`Invalid format: "${format}"`);
    }

    return format;
};

const parsed = typeFlag(process.argv.slice(2), {
    format: JsFormat,
})
```

This outputs the type:
```ts
const parsed: {
    flags: {
        format: JsFormats[];
    };
    ...
}
```

## ⚙️ API

### typeFlag(argv, flagSchema)

Returns an object with the shape:
```ts
{
    flags: {
        [flagName: string]: InferredType[];
    };
    unknownFlags: {
        [flagName: string]: (string | boolean)[];
    };
    '--': string[];
}
```

#### argv
Type: `string[]`

The argv array to parse. Pass in `process.argv.slice(2)`.


#### flagSchema
Type:
```ts
type TypeFunction = (argvValue: any) => any;

type FlagSchema = {
    [flagName: string]: TypeFunction | {
        type?: TypeFunction; // defaults to String
        alias?: string;
    };
};
```


An object containing flag schema definitions. Where the key is the flag name, and the value is either the type function or an object containing the type function and/or alias.

## 🙋‍♀️ FAQ

### Why do I have to manually pass in `process.argv`?
Few reasons:
- Type-flag designed to be an utility tool that can be extended in other CLI tools
- To mock the simplicity & clarity of [minimist](https://github.com/substack/minimist)
- Explicitly passing it in makes it easier to intercept for pre-processing and also testing

### Why are all flags in an array?
To minimize the scope of the library to parsing & types.

This way, the user can choose whether to accept an array of multiple values, or to pop the last element as a single value.

Support for validation, required flags, default values, etc. should be added in user-land.
