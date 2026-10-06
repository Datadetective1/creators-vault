import { auth } from "./auth";
import { common } from "./common";
import { consent } from "./consent";
import { dashboard } from "./dashboard";
import { landing } from "./landing";
import { pricing } from "./pricing";

export const en = { auth, common, consent, dashboard, landing, pricing };

/** The full dictionary shape every locale must satisfy. */
export type Messages = typeof en;
