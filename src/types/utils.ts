// Custom utility types for type-safe operations

// Deep readonly - immutable nested objects
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// Require exactly one of a set of keys
export type RequireExactlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, never>> }[Keys];

// Make all properties optional recursively
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Make all properties required recursively
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// Extract keys of specific type
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// Pick only keys of specific type
export type PickByType<T, U> = Pick<T, KeysOfType<T, U>>;

// Omit only keys of specific type
export type OmitByType<T, U> = Omit<T, KeysOfType<T, U>>;

// Create a type with required keys
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// Create a type with optional keys
export type WithOptional<T, K extends keyof T> = Omit<T, K> & { [P in K]?: T[P] };

// Merge two types, with second type taking precedence
export type Merge<T, U> = Omit<T, keyof U> & U;

// Create a readonly version of a type
export type Immutable<T> = {
  readonly [P in keyof T]: T[P];
};

// Extract promise type
export type PromiseType<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

// Extract array item type
export type ArrayItemType<T extends readonly any[]> = T extends (infer U)[] ? U : never;

// Create a type that is either T or an array of T
export type OneOrMany<T> = T | T[];

// Create a type that is either T or null
export type Nullable<T> = T | null;

// Create a type that is either T or undefined
export type Optional<T> = T | undefined;

// Create a type that is either T, null, or undefined
export type Maybe<T> = T | null | undefined;

// Function type with specific parameter and return types
export type Fn<P = any, R = any> = (param: P) => R;

// Async function type
export type AsyncFn<P = any, R = any> = (param: P) => Promise<R>;

// Event handler type
export type EventHandler<T = Event> = (event: T) => void;

// Change event handler type
export type ChangeHandler<T = EventTarget> = EventHandler<ChangeEvent<T>>;

// Key-value pair type
export type KeyValuePair<K extends PropertyKey, V> = [K, V];

// Record type with specific key and value types
export type TypedRecord<K extends PropertyKey, V> = Record<K, V>;

// Extract return type of a function
export type ReturnTypeOf<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R ? R : any;

// Extract parameters of a function
export type ParametersOf<T extends (...args: any[]) => any> = T extends (...args: infer P) => any ? P : never;

// Create a type that excludes null and undefined
export type NonNullable<T> = T extends null | undefined ? never : T;

// Create a type that includes only null and undefined
export type NullableOrUndefined<T> = T extends NonNullable<T> ? never : T;

// Extract the keys that are optional in a type
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// Extract the keys that are required in a type
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

// Create a type with only required keys
export type OnlyRequired<T> = Pick<T, RequiredKeys<T>>;

// Create a type with only optional keys
export type OnlyOptional<T> = Pick<T, OptionalKeys<T>>;

// Union to intersection type
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

// Last element of a tuple type
export type Last<T extends any[]> = T extends [...any, infer L] ? L : never;

// First element of a tuple type
export type First<T extends any[]> = T extends [infer F, ...any[]] ? F : never;

// Tail of a tuple type (all elements except first)
export type Tail<T extends any[]> = T extends [any, ...infer Rest] ? Rest : never;

// Head of a tuple type (all elements except last)
export type Head<T extends any[]> = T extends [...infer Rest, any] ? Rest : never;

// String manipulation types
export type Split<S extends string, D extends string> = S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] : [S];

export type TrimLeft<S extends string> = S extends ' ' | '\n' | '\t' ? TrimLeft<Slice<S, 1>> : S;

export type TrimRight<S extends string> = S extends `${infer T} ` | `${infer T}\n` | `${infer T}\t` ? TrimRight<T> : S;

export type Trim<S extends string> = TrimLeft<TrimRight<S>>;

export type Lowercase<S extends string> = S extends `${infer T}${infer U}` ? `${Lowercase<T>}${Lowercase<U>}` : S;

export type Uppercase<S extends string> = S extends `${infer T}${infer U}` ? `${Uppercase<T>}${Uppercase<U>}` : S;

export type Capitalize<S extends string> = S extends `${infer T}${infer U}` ? `${Uppercase<T>}${Lowercase<U>}` : S;

// Number manipulation types
export type Add<A extends number, B extends number> = [...Tuple<A>, ...Tuple<B>]['length'] extends number ? [...Tuple<A>, ...Tuple<B>]['length'] : never;

export type Subtract<A extends number, B extends number> = Tuple<A> extends [...Tuple<B>, ...infer Rest] ? Rest['length'] : never;

type Tuple<T extends number, R extends any[] = []> = R['length'] extends T ? R : Tuple<T, [...R, any]>;

// Conditional type for checking if a type is a promise
export type IsPromise<T> = T extends Promise<any> ? true : false;

// Conditional type for checking if a type is an array
export type IsArray<T> = T extends any[] ? true : false;

// Conditional type for checking if a type is a function
export type IsFunction<T> = T extends (...args: any[]) => any ? true : false;

// Conditional type for checking if a type is an object
export type IsObject<T> = T extends object ? (T extends any[] ? false : true) : false;

// Extract the instance type of a class constructor
export type InstanceType<T extends new (...args: any[]) => any> = T extends new (...args: any[]) => infer R ? R : any;

// Extract the constructor type of a class instance
export type Constructor<T> = new (...args: any[]) => T;

// Create a type that is the opposite of another type
export type Opposite<T> = T extends true ? false : T extends false ? true : T;

// Create a type that is the negation of another type
export type Not<T extends boolean> = T extends true ? false : true;

// Create a type that is the conjunction of two types
export type And<T extends boolean, U extends boolean> = T extends true ? U extends true ? true : false : false;

// Create a type that is the disjunction of two types
export type Or<T extends boolean, U extends boolean> = T extends true ? true : U extends true ? true : false;

// Create a type that is the exclusive or of two types
export type Xor<T extends boolean, U extends boolean> = Or<And<T, Not<U>>, And<Not<T>, U>>;

// Create a type that implies another type
export type Implies<T extends boolean, U extends boolean> = Or<Not<T>, U>;

// Create a type that is equivalent to another type
export type Iff<T extends boolean, U extends boolean> = Or<And<T, U>, And<Not<T>, Not<U>>>;
