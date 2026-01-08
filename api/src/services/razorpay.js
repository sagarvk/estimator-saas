import Razorpay from "razorpay";

export function makeRazorpay({ key_id, key_secret }) {
  if (!key_id || !key_secret) {
    throw new Error(
      "Razorpay keys missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in apps/api/.env"
    );
  }

  const client = new Razorpay({ key_id, key_secret });

  // sanity check
  if (!client?.orders || typeof client.orders.create !== "function") {
    throw new Error(
      "Razorpay client not initialized correctly (orders.create missing)."
    );
  }

  return client;
}
