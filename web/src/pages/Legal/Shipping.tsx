import LegalLayout from "./LegalLayout";

export default function Shipping() {
  return (
    <LegalLayout title="Shipping & Delivery Policy" updatedAt="2026-01-08">
      <h3>1. Delivery Method</h3>
      <p>
        This is a digital product. Delivery is provided via an in-app download link (signed URL) immediately after
        successful payment confirmation.
      </p>

      <h3>2. Delivery Time</h3>
      <p>
        Typically instant. In rare cases, delivery may be delayed due to network/server issues.
      </p>

      <h3>3. Support</h3>
      <p>
        If you have paid and did not receive the PDF, contact support with your payment/order details.
      </p>
    </LegalLayout>
  );
}
