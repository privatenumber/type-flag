# `getFlag` consistency with `typeFlag`

Verified 2026-11-06 against the `getFlag` [parsing tests](../../tests/specs/get-flag/parsing.ts). The following decisions ship in the v5 beta:

- A scalar parser returns the last value and consumes all occurrences. This matches `typeFlag` and most surveyed parsers ([results](./argv-survey/results.md#repeated-flags)). [POSIX Utility Syntax Guideline 11](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html) recommends interpreting repeated options with option-arguments in command-line order; it does not itself prescribe last-wins. Calls that use the default argv each parse a fresh `process.argv.slice(2)`, so they do not affect each other.
- Do not group extracted flags with flags another parser reads. Removing a matched alias preserves the other characters in order, but can change how a later parser interprets them: extracting `-q` from `-q-abc` leaves `--abc`. A remainder of exactly `--` is removed. See the [forwarding decision and remaining limitations](./flag-names.md#forwarding-hazard-partially-consumed-groups).
- Search names match their dash form: `-h` matches short flags and groups, not `--h`; `--help` matches long flags. This matches the `typeFlag` single-character name rule.
- Each comma-separated name is trimmed. Invalid names throw instead of being ignored: a short name has one dash and one character; a long name has two dashes and at least two characters. Names cannot contain value delimiters or whitespace.

The tests also cover array values, explicit values, alias groups, `--`, `__proto__`, and digit aliases when deciding whether a dash-digit token is a value.

## Historical observations

Research on 2026-11-05 against type-flag `v5.0.0-beta.20` and `4.5.2` found the following behavior ([results](./argv-survey/results.md#type-flag-probes)):

| Call | Old result | `typeFlag` equivalent |
| --- | --- | --- |
| `getFlag('-h', Boolean, ['--h'])` | `true` | `--h` is unknown for a single-character name |
| `getFlag('--a, -b', Boolean, ['-b'])` | `undefined`, `-b` left in argv | n/a |
| `getFlag('a', String, ['--a', 'x'])` | `undefined` | n/a: `a` is a schema key, not a dashed CLI spelling |
| `getFlag('--name', String, ['--name', 'x', '--name', 'y'])` | `"x"`, `--name y` left in argv | `typeFlag({ name: String }, ...)` gives `"y"` |

Keeping the first occurrence would allow callers to extract one occurrence at a time. A GitHub code search for `from 'type-flag'` on 2026-11-05 found no caller relying on that behavior, but only covered indexed public repositories.
