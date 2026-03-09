import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { trackButtonClick } from "../../utils/analytics.utils";
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
  const intl = useIntl();

  const pricingPlans: PricingPlan[] = [
    {
      name: intl.formatMessage({ defaultMessage: "Personal" }),
      description: intl.formatMessage({
        defaultMessage: "For individuals who want fast, local dictation.",
      }),
      monthlyPrice: 0,
      yearlyPrice: null,
      features: [
        intl.formatMessage({ defaultMessage: "AI dictation" }),
        intl.formatMessage({ defaultMessage: "Bring your own API key" }),
        intl.formatMessage({ defaultMessage: "Offline mode" }),
        intl.formatMessage({ defaultMessage: "Smart autocorrect" }),
        intl.formatMessage({ defaultMessage: "Community support" }),
        {
          text: intl.formatMessage({ defaultMessage: "Basic agent mode" }),
          deemphasized: true,
        },
      ],
      cta: intl.formatMessage({ defaultMessage: "Download free" }),
      popular: false,
      isLifetime: true,
    },
    {
      name: intl.formatMessage({ defaultMessage: "Pro" }),
      description: intl.formatMessage({
        defaultMessage:
          "Full power with cloud transcription and advanced integrations.",
      }),
      monthlyPrice: 12,
      yearlyPrice: 8,
      features: [
        {
          text: intl.formatMessage({
            defaultMessage: "Everything in Personal",
          }),
          deemphasized: true,
        },
        intl.formatMessage({ defaultMessage: "AI dictation" }),
        intl.formatMessage({ defaultMessage: "Cross-device sync" }),
        intl.formatMessage({ defaultMessage: "Unlimited words per month" }),
        intl.formatMessage({ defaultMessage: "Priority support" }),
      ],
      cta: intl.formatMessage({ defaultMessage: "Download free" }),
      popular: true,
    },
    {
      name: intl.formatMessage({ defaultMessage: "Enterprise" }),
      description: intl.formatMessage({
        defaultMessage: "Custom solutions for teams with advanced needs.",
      }),
      monthlyPrice: null,
      yearlyPrice: null,
      features: [
        {
          text: intl.formatMessage({ defaultMessage: "Everything in Pro" }),
          deemphasized: true,
        },
        intl.formatMessage({ defaultMessage: "On-premise deployment" }),
        intl.formatMessage({ defaultMessage: "Custom integrations" }),
        intl.formatMessage({
          defaultMessage: "Data privacy & compliance",
        }),
        intl.formatMessage({ defaultMessage: "Dedicated support" }),
        intl.formatMessage({ defaultMessage: "Bring your own cloud" }),
      ],
      cta: intl.formatMessage({ defaultMessage: "Contact us" }),
      popular: false,
      isEnterprise: true,
    },
  ];

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
            aria-label={intl.formatMessage({
              defaultMessage: "Toggle billing period",
            })}
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
                  onClick={() => trackButtonClick(`pricing-${plan.name.toLowerCase()}`)}
                >
                  {plan.cta}
                </a>
              ) : (
                <DownloadButton
                  className={plan.popular ? styles.ctaButton : styles.ctaButtonOutline}
                  trackingId={`pricing-${plan.name.toLowerCase()}`}
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
