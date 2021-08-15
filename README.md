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

    // Define flags here
    someString: String,

    someNumber: {
        type: Number,
        alias: 'n' // Set an alias (eg. -n 45)
    },

    someBoolean: {
        type: Boolean,
        alias: 'b'
    }
})
```

This outputs the type:
```ts
const parsed: {
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
node ./cli --some-string hello --number=3 --someBoolean
```

### Examples

#### Custom type
Simply create a function that accepts a string argument, validates and returns the parsed value with the expected type.

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

## ⚙️ Options

### typeFlag(argv, flagSchema)

Returns an object with the shape:
```ts
{
    flags: {
        [flagName: string]: InferredType[];
    },
    unknownFlags: {
        [flagName: string]: (string | boolean)[];
    },
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


An object of flag schema definitions.

## 🙋‍♀️ FAQ

### Why do I have to pass in process.argv?
- Designed to be utility tool that can be used in other CLI tools
- Easier to test and intercept
- To mock the simplicity & clarity of [minimist](https://github.com/substack/minimist)

### Why are all flags in an array?
To minimize the scope of the library to parsing & types.

This way, the user can choose whether to accept an array of multiple values, or to pop the last element.

Support for validation, required flags, default values, etc. should be added on the usage end.
