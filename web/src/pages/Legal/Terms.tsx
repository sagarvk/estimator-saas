import LegalLayout from "./LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Terms & Conditions" updatedAt="2026-01-08">
      <h3>1. Overview</h3>
      <p>
        EstimatorPro is a SaaS platform for Civil Engineers & Architects to generate construction
        estimate PDFs. By using the service, you agree to these Terms.
      </p>

      <h3>2. Account & Access</h3>
      <ul>
        <li>You must provide accurate information during signup.</li>
        <li>You are responsible for safeguarding your account credentials.</li>
      </ul>

      <h3>3. Pricing & Payments</h3>
      <p>
        Estimates are available on a pay-per-estimate basis (or as configured in the app settings).
        Payments are processed via Razorpay.
      </p>

      <h3>4. Output Disclaimer</h3>
      <p>
        Generated estimates are based on the inputs you provide and the configured master data. You
        should verify technical accuracy before using it for contractual or government submissions.
      </p>

      <h3>5. Service Availability</h3>
      <p>
        We try to provide uninterrupted access, but downtime may occur due to maintenance or third-party services.
      </p>

      <h3>6. Contact</h3>
      <p>
        For support, please contact the email/phone provided inside the app profile section.
      </p>
    </LegalLayout>
  );
}
