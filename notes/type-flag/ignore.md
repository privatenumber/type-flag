# `ignore` and flag values

Researched 2026-11-05 against type-flag `v5.0.0-beta.20` and `4.5.2`. Fixed in the v5 beta; see the [ignore tests](../../tests/specs/type-flag/parsing.ts).

## Summary

Decision: keep an ignored defined value-taking flag and its value together in argv. In 4.5.2 and 5.0.0-beta.20, type-flag instead parses that value as a positional and removes it from argv.

## Problem

Before this fix, the README said: "Ignored tokens are left in `argv` exactly as passed, so an `ignore` callback can stop parsing at a command name and preserve the full command tail for another parser."

Observed ([results](./argv-survey/results.md#type-flag-probes)), with `name: String` and `ignore` returning true for defined flags:

```js
typeFlag({ name: String }, ['--name', 'x', 'pos'], { ignore: type => type === 'flag' })
// _: ['x', 'pos'], argv: ['--name']
```

In 4.5.2 the callback type for a defined flag is `known-flag`, so the same probe there uses `type === 'known-flag'`.

Expected: `argv: ['--name', 'x']`, with `x` never parsed. type-flag knows from the schema that `--name` takes a value, so it can keep the value with the ignored flag.

## Who is affected

- **tsx** ([remove-argv-flags.ts](https://github.com/privatenumber/tsx/blob/v4.23.15/src/remove-argv-flags.ts)) ignores unknown flags and everything after the first positional. After a positional, every later token is ignored too, so the value is never split. The fix does not change tsx.
- **cleye** passes a user's `ignoreArgv` straight to `typeFlag` ([cli.ts#L202-L206](https://github.com/privatenumber/cleye/blob/b6b2e754bfbed22d1652493c245bd800be81add3/src/cli.ts#L202-L206)). An app that ignores a specific defined flag hits the bug.

## Decision

When `ignore` returns true for a defined flag that would take the next token as its value, skip that next token too and leave both in argv. The iterator decides whether the next token is a value, including dash-digit values, so flags and the `--` delimiter keep their normal precedence. The [ignore tests](../../tests/specs/type-flag/parsing.ts) cover the value, flag, alias group, Boolean, end-of-input, and delimiter cases.

## Unknown flags: cannot be fixed

With `ignore` returning true for unknown flags, `--target value` leaves `--target` in argv and parses `value` as a positional. type-flag cannot know whether an unknown flag takes a value. The README documents the `--target-flag=value` form for forwarding unknown flags with values.
