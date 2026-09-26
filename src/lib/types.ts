import type { PlanDefinition } from "@/lib/plans";

/**
 * Shared row and view-model types.
 *
 * Deliberately free of `server-only` so Client Components can import these
 * shapes. Keeping them here instead of in vault.ts means a client file can
 * never pull a server module into its bundle by reaching for a type.
 */

export interface AssetRow {
  id: string;
  user_id: string;
  filename: string;
  storage_provider: string;
  storage_key: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
}

export interface SubscriptionRow {
  plan: string;
  status: string;
  current_period_end: string | null;
  scheduled_cancel_at: string | null;
  paddle_subscription_id: string | null;
  paddle_customer_id: string | null;
}

export interface VaultSummary {
  plan: PlanDefinition;
  status: string;
  currentPeriodEnd: string | null;
  /** Set when the subscriber cancelled "at period end"; the plan stays paid until then. */
  scheduledCancelAt: string | null;
  usedBytes: number;
  fileCount: number;
  limitBytes: number;
  percentUsed: number;
  hasPaddleSubscription: boolean;
  /** Paddle customer id (ctm_…) once the user has checked out; used for Paddle Retain. */
  paddleCustomerId: string | null;
}
