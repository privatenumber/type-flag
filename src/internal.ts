/**
 * Lower-level helpers for tooling built on top of type-flag (e.g. cleye).
 *
 * These are exposed via the `type-flag/internal` subpath to keep the main entry
 * focused on the common API. They are not part of the main public surface;
 * prefer `type-flag` unless you are building tooling on type-flag.
 */
export { flagNameToKebab } from './utils.ts';
export { createPositionalArguments } from './positional-arguments.ts';
export { isStandardSchema, type StandardSchemaV1 } from './standard-schema.ts';
