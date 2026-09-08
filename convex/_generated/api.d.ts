/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as guests from "../guests.js";
import type * as maintenance from "../maintenance.js";
import type * as operate from "../operate.js";
import type * as properties from "../properties.js";
import type * as reservations from "../reservations.js";
import type * as revenue from "../revenue.js";
import type * as seed from "../seed.js";
import type * as taxes from "../taxes.js";
import type * as team from "../team.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  guests: typeof guests;
  maintenance: typeof maintenance;
  operate: typeof operate;
  properties: typeof properties;
  reservations: typeof reservations;
  revenue: typeof revenue;
  seed: typeof seed;
  taxes: typeof taxes;
  team: typeof team;
  waitlist: typeof waitlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
