import React from "react";
import LegalLayout from "../Legal/LegalLayout";

export default function ContactUs() {
  return (
    <LegalLayout title="Contact Us">
      <p>
        We’re here to help. If you have any questions, concerns, or need support
        regarding our services, please feel free to reach out to us using the
        details below.
      </p>

      <h2>Get in Touch</h2>
      <p>
        You can contact <strong>EstimatorPro Consultants</strong> through the
        following channel:
      </p>

      <ul>
        <li>
          <strong>Email:</strong>{" "}
          <a
            href="mailto:estimatorproconsultants@gmail.com"
            className="text-primary hover:underline"
          >
            estimatorproconsultants@gmail.com
          </a>
        </li>
      </ul>

      <h2>Office Address</h2>
      <p>
        <strong>EstimatorPro Consultants</strong>
        <br />
        Ahmednagar, Maharashtra
      </p>

      <h2>Business Hours</h2>
      <p>
        Monday to Saturday: 10:00 AM – 6:00 PM
        <br />
        Sunday & Public Holidays: Closed
      </p>

      <h2>Support</h2>
      <p>
        For technical issues, account-related queries, or billing support,
        please mention relevant details in your email to help us assist you
        faster.
      </p>
    </LegalLayout>
  );
}
