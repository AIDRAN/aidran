/**
 * Branded id types — force callers to acknowledge what kind of id they're
 * passing. Construct via the helper below; don't cast bare strings.
 *
 * Why branded: distinct id types per entity (record / story / entity /
 * topic / signal / source) prevent accidental swaps at the call site.
 * The compiler refuses to mix them.
 */

declare const brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brand]: B };

/** Record id — bigint serialized as string (JS-safe). */
export type RecordId = Brand<string, 'RecordId'>;
/** Story id — uuidv7. */
export type StoryId = Brand<string, 'StoryId'>;
/** Entity id — serial integer serialized as number. */
export type EntityId = Brand<number, 'EntityId'>;
/** Topic id — serial integer. */
export type TopicId = Brand<number, 'TopicId'>;
/** Signal id — serial integer. */
export type SignalId = Brand<number, 'SignalId'>;
/** Source id — serial integer (config row). */
export type SourceId = Brand<number, 'SourceId'>;

export const RecordId = (s: string): RecordId => s as RecordId;
export const StoryId = (s: string): StoryId => s as StoryId;
export const EntityId = (n: number): EntityId => n as EntityId;
export const TopicId = (n: number): TopicId => n as TopicId;
export const SignalId = (n: number): SignalId => n as SignalId;
export const SourceId = (n: number): SourceId => n as SourceId;
