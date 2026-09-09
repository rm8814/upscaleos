/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as adminUsers from "../adminUsers.js";
import type * as ar from "../ar.js";
import type * as auth from "../auth.js";
import type * as authz from "../authz.js";
import type * as channels from "../channels.js";
import type * as commissions from "../commissions.js";
import type * as crons from "../crons.js";
import type * as folios from "../folios.js";
import type * as groups from "../groups.js";
import type * as guests from "../guests.js";
import type * as history from "../history.js";
import type * as housekeeping from "../housekeeping.js";
import type * as http from "../http.js";
import type * as invoices from "../invoices.js";
import type * as maintenance from "../maintenance.js";
import type * as occupancy from "../occupancy.js";
import type * as operate from "../operate.js";
import type * as properties from "../properties.js";
import type * as rateModel from "../rateModel.js";
import type * as rates from "../rates.js";
import type * as reports from "../reports.js";
import type * as reservations from "../reservations.js";
import type * as revenue from "../revenue.js";
import type * as seed from "../seed.js";
import type * as taxEngine from "../taxEngine.js";
import type * as taxes from "../taxes.js";
import type * as team from "../team.js";
import type * as transactionCodes from "../transactionCodes.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  adminUsers: typeof adminUsers;
  ar: typeof ar;
  auth: typeof auth;
  authz: typeof authz;
  channels: typeof channels;
  commissions: typeof commissions;
  crons: typeof crons;
  folios: typeof folios;
  groups: typeof groups;
  guests: typeof guests;
  history: typeof history;
  housekeeping: typeof housekeeping;
  http: typeof http;
  invoices: typeof invoices;
  maintenance: typeof maintenance;
  occupancy: typeof occupancy;
  operate: typeof operate;
  properties: typeof properties;
  rateModel: typeof rateModel;
  rates: typeof rates;
  reports: typeof reports;
  reservations: typeof reservations;
  revenue: typeof revenue;
  seed: typeof seed;
  taxEngine: typeof taxEngine;
  taxes: typeof taxes;
  team: typeof team;
  transactionCodes: typeof transactionCodes;
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
