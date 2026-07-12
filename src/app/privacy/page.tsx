import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Maintainr",
  description:
    "How Maintainr collects, uses, and protects your maintenance-management data.",
};

const ACCENT = "#ea580c";

export default function PrivacyPage() {
  return (
    <main
      style={{
        background: "#ffffff",
        color: "#111827",
        minHeight: "100vh",
        lineHeight: 1.7,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>
        <div
          style={{
            fontSize: "1.4rem",
            fontWeight: 800,
            letterSpacing: "0.12em",
          }}
        >
          MAINTAIN<span style={{ color: ACCENT }}>R</span>
        </div>
        <div
          style={{
            fontSize: "0.7rem",
            color: "#6b7280",
            letterSpacing: "0.1em",
            marginBottom: "2.5rem",
          }}
        >
          PLAINSPOKEN FOUNDRY NINE
        </div>

        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.4rem" }}>
          Privacy Policy
        </h1>
        <div
          style={{
            fontSize: "0.75rem",
            color: "#6b7280",
            letterSpacing: "0.05em",
            marginBottom: "2rem",
          }}
        >
          Last updated: 12 July 2026
        </div>

        <p style={pStyle}>
          Maintainr (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is operated by Plainspoken Foundry
          Nine. This policy explains what information the Maintainr application and
          website (maintainr.plainspokenfoundrynine.com) collect, how we use it, and
          the choices you have. Maintainr is a business tool for computerized
          maintenance management (CMMS): it helps organizations track assets,
          schedule and record maintenance work orders, manage parts and technicians,
          and anticipate equipment failures.
        </p>

        <H2>1. Information we collect</H2>
        <ul style={ulStyle}>
          <li style={liStyle}>
            <strong style={strongStyle}>Account information.</strong> Your email
            address and, for accounts you create, a password stored only in hashed
            form. Used to identify you, sign you in, and keep each organization&apos;s
            data separated.
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Maintenance data you provide.</strong> The
            facilities, assets, work orders, maintenance schedules, parts,
            technicians, downtime events, sensor readings, and related records you
            create. This content is tied to your organization account.
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Usage and diagnostic data.</strong> Limited
            product-analytics and diagnostic information (for example, sign-in events
            and basic interaction data) to operate, secure, and improve the service.
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Technical data.</strong> Standard server logs
            such as IP address, device/browser type, and timestamps, used for
            security and reliability.
          </li>
        </ul>

        <H2>2. How we use information</H2>
        <p style={pStyle}>
          We use the information to provide and maintain the service, authenticate
          users, run maintenance and predictive-maintenance features, keep each
          organization&apos;s data separated and secure, maintain records for
          accountability, diagnose problems, and improve the product. We do not sell
          your personal information, and we do not use it for third-party
          advertising.
        </p>

        <H2>3. How information is shared</H2>
        <p style={pStyle}>
          Your information is shared only with service providers that help us run
          Maintainr (such as hosting and analytics providers) under appropriate
          confidentiality obligations, or where required by law. Each
          organization&apos;s data is isolated from every other customer on the
          platform. If you connect an external system through a configured connector,
          data is exchanged only with the endpoint you specify.
        </p>

        <H2>4. Data security</H2>
        <p style={pStyle}>
          All data is transmitted over encrypted connections (HTTPS/TLS). Passwords
          are stored only in hashed form. Access to your data is restricted by
          authentication, and each organization&apos;s data is isolated from all
          others.
        </p>

        <H2>5. Data retention and deletion</H2>
        <p style={pStyle}>
          We retain account and content data for as long as your account is active,
          subject to any retention period configured for the service. You may request
          access to, correction of, or deletion of your personal data by contacting us
          at{" "}
          <a href="mailto:support@plainspokenfoundrynine.com" style={{ color: ACCENT }}>
            support@plainspokenfoundrynine.com
          </a>
          .
        </p>

        <H2>6. Children&apos;s privacy</H2>
        <p style={pStyle}>
          Maintainr is a business tool intended for use by adults (18+). It is not
          directed to children and we do not knowingly collect data from children.
        </p>

        <H2>7. Changes to this policy</H2>
        <p style={pStyle}>
          We may update this policy from time to time. Material changes will be
          reflected by updating the &quot;Last updated&quot; date above.
        </p>

        <H2>8. Contact</H2>
        <p style={pStyle}>
          Questions about this policy or your data:{" "}
          <a href="mailto:support@plainspokenfoundrynine.com" style={{ color: ACCENT }}>
            support@plainspokenfoundrynine.com
          </a>
          , Plainspoken Foundry Nine, 3518 Cedar Mills Dr, Kingwood, TX 77345, USA.
        </p>

        <div
          style={{
            fontSize: "0.7rem",
            color: "#6b7280",
            letterSpacing: "0.06em",
            marginTop: "3rem",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "1.5rem",
          }}
        >
          MAINTENANCE MANAGEMENT · Plainspoken Foundry Nine
        </div>
      </div>
    </main>
  );
}

const pStyle: React.CSSProperties = { marginBottom: "1rem", color: "#374151" };
const ulStyle: React.CSSProperties = {
  margin: "0 0 1rem 1.2rem",
  color: "#374151",
};
const liStyle: React.CSSProperties = { marginBottom: "0.6rem" };
const strongStyle: React.CSSProperties = { color: "#111827" };

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "1.05rem",
        fontWeight: 600,
        color: ACCENT,
        margin: "2rem 0 0.6rem",
      }}
    >
      {children}
    </h2>
  );
}
