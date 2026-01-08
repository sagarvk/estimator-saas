import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { makeSupabaseServiceClient } from "./services/supabase.js";
import { makeAuthMiddleware } from "./middleware/auth.js";
import { makeRazorpay } from "./services/razorpay.js";

import { makeProfileRouter } from "./routes/profile.js";
import { makeMastersRouter } from "./routes/masters.js";
import { makeEstimateRouter } from "./routes/estimates.js";
import { makePaymentsRouter } from "./routes/payments.js";
import { makeSettingsRouter } from "./routes/settings.js";
import { makeEnsureProfile } from "./middleware/ensureProfile.js";
import { makeDashboardRouter } from "./routes/dashboard.js";

dotenv.config();

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://estimatorpro-saas.vercel.app",
  // add custom domain later if any: "https://estimatorpro.co.in"
];

app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser calls (like curl/postman)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
app.use(express.json({ limit: "5mb" }));

const db = makeSupabaseServiceClient({
  url: process.env.SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

const requireUser = makeAuthMiddleware({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
});
const ensureProfile = makeEnsureProfile({ db });
const razorpay = makeRazorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
//console.log("Razorpay orders.create exists:", !!razorpay?.orders?.create);
//console.log("pricing fetch ok");
app.get("/health", (_, res) => res.json({ ok: true }));
app.use(
  "/api/settings",
  requireUser,
  ensureProfile,
  makeSettingsRouter({ db })
);
app.use("/api/profile", requireUser, ensureProfile, makeProfileRouter({ db }));
app.use("/api/masters", requireUser, ensureProfile, makeMastersRouter({ db }));
app.use(
  "/api/estimates",
  requireUser,
  ensureProfile,
  makeEstimateRouter({ db, gstRate: Number(process.env.GST_RATE || 0.18) })
);
app.use(
  "/api/payments",
  requireUser,
  ensureProfile,
  makePaymentsRouter({ db, razorpay })
);
app.use("/api/dashboard", requireUser, makeDashboardRouter({ db }));

app.listen(process.env.PORT || 3001, () =>
  console.log("API on", process.env.PORT || 3001)
);
