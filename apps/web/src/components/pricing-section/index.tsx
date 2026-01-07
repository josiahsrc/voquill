import { useState } from "react";
import { FormattedMessage } from "react-intl";
import pageStyles from "../../styles/page.module.css";
import { DownloadButton } from "../download-button";
import styles from "./pricing-section.module.css";

type Feature = string | { text: string; deemphasized?: boolean };

type PricingPlan = {
  name: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  features: Feature[];
  cta: string;
  popular: boolean;
  isEnterprise?: boolean;
  isLifetime?: boolean;
};

const pricingPlans: PricingPlan[] = [
  {
    name: "Personal",
    description: "For individuals who want fast, local dictation.",
    monthlyPrice: 0,
    yearlyPrice: null,
    features: [
      "AI dictation",
      "Bring your own API key",
      "Offline mode",
      "Smart autocorrect",
      "Community support",
      { text: "Basic agent mode", deemphasized: true },
    ],
    cta: "Download free",
    popular: false,
    isLifetime: true,
  },
  {
    name: "Pro",
    description: "Full power with cloud transcription and advanced integrations.",
    monthlyPrice: 12,
    yearlyPrice: 8,
    features: [
      { text: "Everything in Personal", deemphasized: true },
      "AI dictation",
      "Advanced agent mode",
      "MCP integrations",
      "Unlimited words per month",
      "Priority support",
    ],
    cta: "Download free",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "Custom solutions for teams with advanced needs.",
    monthlyPrice: null,
    yearlyPrice: null,
    features: [
      { text: "Everything in Pro", deemphasized: true },
      "On-premise deployment",
      "Custom integrations",
      "Data privacy & compliance",
      "Dedicated support",
      "Bring your own cloud",
    ],
    cta: "Contact us",
    popular: false,
    isEnterprise: true,
  },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(true);

  const getPrice = (plan: PricingPlan): number | null => {
    if (plan.isEnterprise) return null;
    if (plan.isLifetime) return plan.monthlyPrice;
    return isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  };

  const getYearlyTotal = (plan: PricingPlan): number | null => {
    if (!plan.yearlyPrice) return null;
    return plan.yearlyPrice * 12;
  };

  return (
    <section className={styles.section} id="pricing">
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <span className={pageStyles.badge}>
            <FormattedMessage defaultMessage="Pricing" />
          </span>
          <h2>
            <FormattedMessage defaultMessage="Simple, transparent pricing" />
          </h2>
          <p>
            <FormattedMessage defaultMessage="Choose the plan that works for you. No hidden fees." />
          </p>
        </div>

        {/* Billing Toggle */}
        <div className={styles.billingToggle}>
          <span
            className={`${styles.billingLabel} ${!isYearly ? styles.active : ""}`}
          >
            <FormattedMessage defaultMessage="Monthly" />
          </span>
          <button
            className={styles.toggleButton}
            onClick={() => setIsYearly(!isYearly)}
            aria-label="Toggle billing period"
          >
            <span
              className={`${styles.toggleKnob} ${isYearly ? styles.active : ""}`}
            />
          </button>
          <span
            className={`${styles.billingLabel} ${isYearly ? styles.active : ""}`}
          >
            <FormattedMessage defaultMessage="Yearly" />
          </span>
          <span className={styles.saveBadge}>
            <FormattedMessage defaultMessage="Save 33%" />
          </span>
        </div>

        {/* Pricing Cards */}
        <div className={styles.cardsGrid}>
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`${styles.card} ${plan.popular ? styles.popular : ""}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <span className={styles.popularBadge}>
                  <FormattedMessage defaultMessage="Best value" />
                </span>
              )}

              {/* Card Header */}
              <div className={styles.cardHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planDescription}>{plan.description}</p>
              </div>

              {/* Price */}
              <div className={styles.priceContainer}>
                {getPrice(plan) !== null ? (
                  getPrice(plan) === 0 ? (
                    <>
                      <span className={styles.price}>
                        <FormattedMessage defaultMessage="Free" />
                      </span>
                      <div className={styles.billingNote}>
                        <FormattedMessage defaultMessage="No credit card required" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.priceRow}>
                        <span className={styles.price}>${getPrice(plan)}</span>
                        <span className={styles.pricePeriod}>
                          <FormattedMessage defaultMessage="/ month" />
                        </span>
                      </div>
                      <div className={styles.billingNote}>
                        {isYearly && plan.yearlyPrice !== null && plan.yearlyPrice > 0 ? (
                          <FormattedMessage
                            defaultMessage="Billed annually (${total}/year)"
                            values={{ total: getYearlyTotal(plan) }}
                          />
                        ) : (
                          <FormattedMessage defaultMessage="Billed monthly" />
                        )}
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <span className={styles.customPrice}>
                      <FormattedMessage defaultMessage="Custom" />
                    </span>
                    <div className={styles.billingNote}>
                      {isYearly ? (
                        <FormattedMessage defaultMessage="Billed annually" />
                      ) : (
                        <FormattedMessage defaultMessage="Billed monthly" />
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* CTA Button */}
              {plan.isEnterprise ? (
                <a
                  href="mailto:hello@voquill.com"
                  className={styles.ctaButtonOutline}
                >
                  {plan.cta}
                </a>
              ) : (
                <DownloadButton
                  className={plan.popular ? styles.ctaButton : styles.ctaButtonOutline}
                />
              )}

              {/* Features */}
              <div className={styles.featuresSection}>
                <p className={styles.featuresTitle}>
                  <FormattedMessage defaultMessage="What's included" />
                </p>
                <ul className={styles.featuresList}>
                  {plan.features.map((feature) => {
                    const text = typeof feature === "string" ? feature : feature.text;
                    const deemphasized = typeof feature === "object" && feature.deemphasized;
                    return (
                      <li
                        key={text}
                        className={`${styles.featureItem} ${deemphasized ? styles.deemphasized : ""}`}
                      >
                        <CheckIcon className={styles.checkIcon} />
                        <span>{text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Signal */}
        <div className={styles.trustSignal}>
          <ShieldIcon className={styles.shieldIcon} />
          <span className={styles.trustText}>
            <strong>
              <FormattedMessage defaultMessage="No hidden fees" />
            </strong>
            {" · "}
            <FormattedMessage defaultMessage="Cancel anytime" />
          </span>
        </div>
      </div>
    </section>
  );
}
