import LegalLayout from "./LegalLayout";

export default function Refund() {
  return (
    <LegalLayout title="Cancellation & Refund Policy" updatedAt="2026-01-08">
      <h3>1. Digital Service</h3>
      <p>
        EstimatorPro provides digital services (estimate generation + PDF download). Once the PDF is generated and
        delivered, the service is considered completed.
      </p>

      <h3>2. Refund Eligibility</h3>
      <ul>
        <li>Duplicate payment for the same order (if verified).</li>
        <li>Payment captured but PDF not delivered due to technical error (if verified).</li>
      </ul>

      <h3>3. Not Eligible</h3>
      <ul>
        <li>Incorrect inputs provided by the user.</li>
        <li>Change of mind after successful PDF delivery.</li>
      </ul>

      <h3>4. Processing Timeline</h3>
      <p>
        If approved, refunds are processed to the original payment method as per Razorpay/bank timelines.
      </p>
    </LegalLayout>
  );
}
