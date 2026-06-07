import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// Better Auth owns /api/auth/* — including its Stripe webhook at
// /api/auth/stripe/webhook (subscriptions + our onEvent for credit packs).
export const { GET, POST } = toNextJsHandler(auth);
