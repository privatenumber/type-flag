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
