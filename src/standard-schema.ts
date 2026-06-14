import type { TypeFunction } from './types.ts';

/**
 * Minimal vendored subset of the Standard Schema spec (https://standardschema.dev), v1.
 * Types-only; keeps type-flag zero-dependency. Mirrors `@standard-schema/spec`.
 *
 * Kept byte-compatible with upstream, which relies on a namespace merged with an
 * interface of the same name, so the conflicting stylistic rules are disabled here.
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
 * Adapt a Standard Schema (Zod, Valibot, ArkType, ...) into a type-flag parser.
 * The flag value is validated and typed by the schema's output.
 *
 * Flag parsing is synchronous, so schemas that validate asynchronously throw.
 * On validation failure, throws the first issue's message; type-flag wraps it
 * as `TypeError: Flag "--<name>": <message>` with the original on `.cause`.
 *
 * @example
 * ```ts
 * typeFlag({ size: schemaType(z.enum(['small', 'large'])) })
 * ```
 */
export const schemaType = <Schema extends StandardSchemaV1>(
	schema: Schema,
): TypeFunction<StandardSchemaV1.InferOutput<Schema>> => (
	(value: string) => {
		const result = schema['~standard'].validate(value);

		if (result instanceof Promise) {
			throw new TypeError('Async schema validation is not supported');
		}

		if (result.issues) {
			throw new Error(result.issues[0]?.message ?? 'Validation failed');
		}

		return result.value;
	}
);
