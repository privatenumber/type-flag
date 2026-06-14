/**
 * Standard Schema (https://standardschema.dev) support: the vendored v1 spec
 * types plus the runtime helpers type-flag uses to detect and adapt schemas.
 * The spec is vendored rather than depended on to keep type-flag zero-dependency.
 */
import type { TypeFunction } from './types.ts';

/**
 * Minimal vendored subset of the Standard Schema spec, v1. Mirrors
 * `@standard-schema/spec`. Kept byte-compatible with upstream, which relies on a
 * namespace merged with an interface of the same name, so the conflicting
 * stylistic rules are disabled here.
 */
/* eslint-disable @typescript-eslint/no-namespace -- vendored spec */
/* eslint-disable @typescript-eslint/consistent-type-definitions -- vendored spec */
export declare namespace StandardSchemaV1 {
	export interface Props<Input = unknown, Output = Input> {
		readonly version: 1;
		readonly vendor: string;
		readonly validate: (
			value: unknown,
		) => Result<Output> | Promise<Result<Output>>;
		readonly types?: Types<Input, Output> | undefined;
	}

	export type Result<Output> = SuccessResult<Output> | FailureResult;

	export interface SuccessResult<Output> {
		readonly value: Output;
		readonly issues?: undefined;
	}

	export interface FailureResult {
		readonly issues: ReadonlyArray<Issue>;
	}

	export interface Issue {
		readonly message: string;
		readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
	}

	export interface PathSegment {
		readonly key: PropertyKey;
	}

	export interface Types<Input = unknown, Output = Input> {
		readonly input: Input;
		readonly output: Output;
	}

	export type InferOutput<Schema extends StandardSchemaV1> =
		NonNullable<Schema['~standard']['types']>['output'];
}

export interface StandardSchemaV1<Input = unknown, Output = Input> {
	readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}
/* eslint-enable @typescript-eslint/consistent-type-definitions */
/* eslint-enable @typescript-eslint/no-namespace */

/**
 * Detect a Standard Schema (Zod, Valibot, ArkType, ...). Used to accept schemas
 * directly as flag types, and exported so tools built on type-flag can apply the
 * same check when introspecting flag definitions.
 */
export const isStandardSchema = (
	value: unknown,
): value is StandardSchemaV1 => (
	// Some schemas (e.g. ArkType) are callable, so check functions too
	(typeof value === 'object' || typeof value === 'function')
	&& value !== null
	&& '~standard' in value
);

/**
 * Adapt a Standard Schema (Zod, Valibot, ArkType, ...) into a parser function.
 *
 * Flag parsing is synchronous, so schemas that validate asynchronously throw.
 * On validation failure, throws the first issue's message.
 */
export const schemaToParser = (
	schema: StandardSchemaV1,
): TypeFunction => (
	(value: string) => {
		const result = schema['~standard'].validate(value);

		if (result instanceof Promise) {
			throw new TypeError('Async schemas are not supported');
		}

		if (result.issues) {
			throw new Error(result.issues[0]?.message ?? 'Validation failed');
		}

		return result.value;
	}
);
