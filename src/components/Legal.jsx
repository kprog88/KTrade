import { useState } from 'react';
import { ChevronLeft, Shield, FileText, AlertTriangle } from 'lucide-react';
import './Legal.css';

const EFFECTIVE_DATE = 'April 1, 2026';
const CONTACT_EMAIL  = 'legal@ktrade.app';
const APP_NAME       = 'KTrade';
const COMPANY        = 'KTrade';
const DOMAIN         = 'ktrade-beta.vercel.app';

// ─── Terms of Service ────────────────────────────────────────────────────────
const TERMS = [
  {
    heading: '1. Acceptance of Terms',
    body: `By accessing or using ${APP_NAME} ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service. We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes your acceptance of the new Terms.`,
  },
  {
    heading: '2. Not Financial Advice',
    body: `${APP_NAME} is an educational and informational tool only. Nothing on this platform constitutes financial, investment, legal, or tax advice. All content — including AI-generated portfolio insights, technical analysis, and market commentary — is for informational and educational purposes only and should not be relied upon as a basis for making investment decisions.\n\nInvesting in securities involves significant risk, including the possible loss of principal. Past performance is not indicative of future results. Always consult a qualified financial advisor before making investment decisions.`,
  },
  {
    heading: '3. Eligibility',
    body: `You must be at least 18 years of age to use the Service. By using ${APP_NAME}, you represent that you are 18 or older and have the legal capacity to enter into these Terms.`,
  },
  {
    heading: '4. User Accounts',
    body: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account. ${APP_NAME} is not liable for any loss resulting from unauthorized use of your account.`,
  },
  {
    heading: '5. Acceptable Use',
    body: `You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorized access to any portion of the Service; (c) scrape, harvest, or extract data from the Service by automated means; (d) transmit any malicious code or interfere with the Service's infrastructure; (e) use the Service to manipulate markets or engage in any form of market fraud.`,
  },
  {
    heading: '6. Third-Party Data',
    body: `Market data, pricing information, and financial data displayed on ${APP_NAME} is sourced from third-party providers (including Yahoo Finance). ${APP_NAME} does not guarantee the accuracy, completeness, or timeliness of this data. We are not responsible for errors, omissions, or delays in third-party data.`,
  },
  {
    heading: '7. AI-Generated Content',
    body: `${APP_NAME} uses artificial intelligence to generate portfolio analysis and insights. AI-generated content may be inaccurate, incomplete, or inappropriate for your specific situation. You acknowledge that AI analysis is experimental in nature and should never be the sole basis for any investment decision. ${APP_NAME} bears no liability for losses arising from reliance on AI-generated content.`,
  },
  {
    heading: '8. Intellectual Property',
    body: `All content, features, and functionality of the Service — including but not limited to text, graphics, logos, and software — are owned by ${COMPANY} and are protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.`,
  },
  {
    heading: '9. Disclaimer of Warranties',
    body: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.`,
  },
  {
    heading: '10. Limitation of Liability',
    body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${COMPANY.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF DATA, OR FINANCIAL LOSSES, ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PRECEDING 12 MONTHS.`,
  },
  {
    heading: '11. Termination',
    body: `We reserve the right to suspend or terminate your access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.`,
  },
  {
    heading: '12. Governing Law',
    body: `These Terms are governed by applicable law. Any disputes arising from these Terms or the Service shall be resolved through binding arbitration, except that either party may seek injunctive relief in a court of competent jurisdiction.`,
  },
  {
    heading: '13. Contact',
    body: `For questions about these Terms, contact us at: ${CONTACT_EMAIL}`,
  },
];

// ─── Privacy Policy ──────────────────────────────────────────────────────────
const PRIVACY = [
  {
    heading: '1. Information We Collect',
    body: `We collect the following information when you use ${APP_NAME}:\n\n• **Account Information**: Email address and display name provided via Google Sign-In (managed by Firebase Authentication).\n• **Portfolio Data**: Holdings, quantities, and average purchase prices you enter into the app, stored in Firebase Firestore.\n• **Usage Data**: Pages visited, features used, and interaction patterns (collected anonymously for product improvement).\n• **Device Information**: Browser type, operating system, and IP address for security and fraud prevention.\n\nWe do not collect or store your brokerage account credentials, bank account information, or actual trading activity.`,
  },
  {
    heading: '2. How We Use Your Information',
    body: `We use your information to:\n\n• Provide, maintain, and improve the Service\n• Generate personalized AI portfolio analysis\n• Authenticate your identity and secure your account\n• Send service-related communications (not marketing spam)\n• Comply with legal obligations\n• Detect and prevent fraud or abuse`,
  },
  {
    heading: '3. Data Storage and Security',
    body: `Your data is stored securely using Google Firebase (Firestore), which provides enterprise-grade security and encryption at rest and in transit. We implement reasonable technical and organizational safeguards to protect your data. However, no internet transmission is 100% secure, and we cannot guarantee absolute security.`,
  },
  {
    heading: '4. Third-Party Services',
    body: `We use the following third-party services that may process your data:\n\n• **Google Firebase** (Authentication & Database) — Google Privacy Policy applies\n• **Anthropic Claude AI** (AI Insights generation) — portfolio data is sent to Claude API for analysis; Anthropic does not train on API data\n• **Yahoo Finance** (Market data) — only ticker symbols are sent, no personal data\n• **Vercel** (Hosting) — industry-standard cloud infrastructure`,
  },
  {
    heading: '5. Data Sharing',
    body: `We do not sell, rent, or share your personal information with third parties for marketing purposes. We may share data only: (a) with service providers listed above who help operate the Service; (b) if required by law or valid legal process; (c) to protect the rights and safety of ${APP_NAME} and its users.`,
  },
  {
    heading: '6. Your Rights',
    body: `You have the right to:\n\n• **Access**: Request a copy of the data we hold about you\n• **Correction**: Request correction of inaccurate data\n• **Deletion**: Request deletion of your account and associated data\n• **Portability**: Request your portfolio data in a portable format\n\nTo exercise these rights, contact us at ${CONTACT_EMAIL}. We will respond within 30 days.`,
  },
  {
    heading: '7. Data Retention',
    body: `We retain your account and portfolio data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law.`,
  },
  {
    heading: '8. Children\'s Privacy',
    body: `${APP_NAME} is not directed to children under 18. We do not knowingly collect personal information from anyone under 18. If we become aware that we have collected data from a child under 18, we will delete it immediately.`,
  },
  {
    heading: '9. GDPR (European Users)',
    body: `If you are located in the European Economic Area, you have additional rights under the General Data Protection Regulation (GDPR), including the right to object to processing and the right to lodge a complaint with your local supervisory authority. Our legal basis for processing is legitimate interest (providing the Service you requested) and consent.`,
  },
  {
    heading: '10. Changes to This Policy',
    body: `We may update this Privacy Policy periodically. We will notify you of significant changes by email or by displaying a notice in the app. Continued use of the Service after changes constitutes your acceptance of the updated policy.`,
  },
  {
    heading: '11. Contact',
    body: `For privacy-related questions or requests: ${CONTACT_EMAIL}`,
  },
];

// ─── Risk Disclaimer ─────────────────────────────────────────────────────────
const RISK = [
  {
    heading: 'Important Notice — Please Read Carefully',
    body: `${APP_NAME} is a financial education and portfolio tracking tool. IT IS NOT A REGISTERED INVESTMENT ADVISOR, BROKER-DEALER, OR FINANCIAL PLANNER. The information provided through this platform does not constitute investment advice.`,
    highlight: true,
  },
  {
    heading: 'Investment Risk',
    body: `All investments involve risk. The value of securities can go down as well as up. You may receive back less than you originally invest. Past performance of any security, investment strategy, or product discussed on this platform is not a guarantee of future results.`,
  },
  {
    heading: 'AI Analysis Disclaimer',
    body: `The AI-generated portfolio insights provided by ${APP_NAME} are produced by a large language model (Anthropic Claude) and are experimental in nature. These insights:\n\n• May be inaccurate, incomplete, or outdated\n• Do not account for your personal financial situation, tax circumstances, or risk tolerance\n• Are not personalized investment recommendations\n• Should not be the sole or primary basis for any investment decision\n\nAlways verify AI-generated analysis with qualified professionals and your own independent research.`,
  },
  {
    heading: 'Market Data Accuracy',
    body: `Market data, prices, and financial information displayed on ${APP_NAME} is sourced from third-party providers and may be delayed, inaccurate, or incomplete. Do not rely on prices shown on this platform to execute actual trades. Always verify prices with your brokerage platform before trading.`,
  },
  {
    heading: 'No Guarantee of Returns',
    body: `${APP_NAME} makes no representation or warranty that any investment strategy, analysis, or recommendation displayed on the platform will result in profit or will not result in loss. There is no such thing as a guaranteed return in investing.`,
  },
  {
    heading: 'Seek Professional Advice',
    body: `Before making any investment decision, you should consider whether it is suitable for your personal circumstances and, if necessary, seek professional advice from a licensed financial advisor, accountant, or tax professional. ${APP_NAME} is a supplement to — not a replacement for — professional financial guidance.`,
  },
  {
    heading: 'Limitation of Liability',
    body: `To the fullest extent permitted by law, ${COMPANY} shall not be liable for any financial losses, damages, or other harm arising from your use of or reliance on any information, analysis, or insights provided through ${APP_NAME}.`,
  },
];

// ─── Page components ──────────────────────────────────────────────────────────
function LegalSection({ section }) {
  return (
    <div className={`legal-section${section.highlight ? ' highlight' : ''}`}>
      <h3 className="legal-section-heading">{section.heading}</h3>
      <div className="legal-section-body">
        {section.body.split('\n\n').map((para, i) => {
          // Handle markdown-style bold
          const parts = para.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
            p.startsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : p
          );
          // Bullet list
          if (para.startsWith('•')) {
            return (
              <ul key={i} className="legal-list">
                {para.split('\n').filter(l => l.trim()).map((line, k) => (
                  <li key={k}>{line.replace(/^•\s*/, '').split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
                    p.startsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : p
                  )}</li>
                ))}
              </ul>
            );
          }
          return <p key={i}>{parts}</p>;
        })}
      </div>
    </div>
  );
}

function LegalPage({ title, icon, effectiveDate, sections, onBack }) {
  return (
    <div className="legal-page">
      <button className="legal-back" onClick={onBack}>
        <ChevronLeft size={16} /> Back
      </button>
      <div className="legal-header">
        <div className="legal-header-icon">{icon}</div>
        <div>
          <h1>{title}</h1>
          <p className="legal-effective">Effective Date: {effectiveDate}</p>
        </div>
      </div>
      <div className="legal-body">
        {sections.map((s, i) => <LegalSection key={i} section={s} />)}
      </div>
      <div className="legal-footer-note">
        Questions? Contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </div>
    </div>
  );
}

// ─── Main export — renders the requested page ─────────────────────────────────
export default function Legal({ page, onBack }) {
  if (page === 'terms') {
    return (
      <LegalPage
        title="Terms of Service"
        icon={<FileText size={28} color="var(--accent-color)" />}
        effectiveDate={EFFECTIVE_DATE}
        sections={TERMS}
        onBack={onBack}
      />
    );
  }
  if (page === 'privacy') {
    return (
      <LegalPage
        title="Privacy Policy"
        icon={<Shield size={28} color="#22c55e" />}
        effectiveDate={EFFECTIVE_DATE}
        sections={PRIVACY}
        onBack={onBack}
      />
    );
  }
  if (page === 'risk') {
    return (
      <LegalPage
        title="Risk Disclaimer"
        icon={<AlertTriangle size={28} color="#f59e0b" />}
        effectiveDate={EFFECTIVE_DATE}
        sections={RISK}
        onBack={onBack}
      />
    );
  }
  return null;
}
