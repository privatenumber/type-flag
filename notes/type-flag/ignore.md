# `ignore` and flag values

Researched 2026-11-05 against type-flag `v5.0.0-beta.20` and `4.5.2`. Not shipped.

## Summary

Recommendation: fix. When `ignore` skips a defined flag that takes a value, type-flag still parses the flag's value as a positional and removes it from argv. The flag and its value end up in different places. This happens in 4.5.2 and in 5.0.0-beta.20.

## Problem

The README says: "Ignored tokens are left in `argv` exactly as passed, so an `ignore` callback can stop parsing at a command name and preserve the full command tail for another parser."

Observed ([results](./argv-survey/results.md#type-flag-probes)), with `name: String` and `ignore` returning true for defined flags:

```js
typeFlag({ name: String }, ['--name', 'x', 'pos'], { ignore: type => type === 'flag' })
// _: ['x', 'pos'], argv: ['--name']
```

Expected: `argv: ['--name', 'x']`, with `x` never parsed. type-flag knows from the schema that `--name` takes a value, so it can keep the value with the ignored flag.

## Who is affected

- **tsx** ([remove-argv-flags.ts](https://github.com/privatenumber/tsx/blob/v4.23.15/src/remove-argv-flags.ts)) ignores unknown flags and everything after the first positional. After a positional, every later token is ignored too, so the value is never split. The fix does not change tsx.
- **cleye** passes a user's `ignoreArgv` straight to `typeFlag` ([cli.ts#L202-L206](https://github.com/privatenumber/cleye/blob/b6b2e754bfbed22d1652493c245bd800be81add3/src/cli.ts#L202-L206)). An app that ignores a specific defined flag hits the bug.

## Proposed fix

When `ignore` returns true for a defined flag that would take the next token as its value, skip that next token too and leave both in argv. Precedence matters: a dash-prefixed next token that the guard would parse as a flag is not the value, so it is parsed normally.

## Unknown flags: cannot be fixed

With `ignore` returning true for unknown flags, `--target value` leaves `--target` in argv and parses `value` as a positional. type-flag cannot know whether an unknown flag takes a value. The README example avoids this by using `--target-flag=value`. Recommendation: document that forwarded unknown flags need the `=` form.
