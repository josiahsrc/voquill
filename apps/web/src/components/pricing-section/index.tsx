import { FormattedMessage } from "react-intl";
import pageStyles from "../../styles/page.module.css";
import styles from "./pricing-section.module.css";

type PricingPlan = {
  name: string;
  nameMessage: React.ReactNode;
  description: React.ReactNode;
  price: string | null;
  period?: string;
  features: React.ReactNode[];
  cta: React.ReactNode;
  ctaHref: string;
  popular: boolean;
};

const CheckIcon = () => (
  <svg
    className={styles.checkIcon}
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

const ShieldIcon = () => (
  <svg
    className={styles.shieldIcon}
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

const pricingPlans: PricingPlan[] = [
  {
    name: "local",
    nameMessage: <FormattedMessage defaultMessage="Local" />,
    description: (
      <FormattedMessage defaultMessage="Run everything locally on your machine. Free forever." />
    ),
    price: "$0",
    features: [
      <FormattedMessage defaultMessage="Unlimited transcriptions" key="1" />,
      <FormattedMessage defaultMessage="Local Whisper model" key="2" />,
      <FormattedMessage defaultMessage="Bring your own API key" key="3" />,
      <FormattedMessage defaultMessage="Fully offline capable" key="4" />,
      <FormattedMessage defaultMessage="Open source" key="5" />,
      <FormattedMessage defaultMessage="Community support" key="6" />,
    ],
    cta: <FormattedMessage defaultMessage="Download" />,
    ctaHref: "/download",
    popular: false,
  },
  {
    name: "starter",
    nameMessage: <FormattedMessage defaultMessage="Starter" />,
    description: (
      <FormattedMessage defaultMessage="Perfect for getting started with cloud transcription." />
    ),
    price: "$0",
    features: [
      <FormattedMessage defaultMessage="30 minutes/month" key="1" />,
      <FormattedMessage defaultMessage="Cloud transcription" key="2" />,
      <FormattedMessage defaultMessage="AI text cleanup" key="3" />,
      <FormattedMessage defaultMessage="Cross-device sync" key="4" />,
      <FormattedMessage defaultMessage="Email support" key="5" />,
    ],
    cta: <FormattedMessage defaultMessage="Get Started" />,
    ctaHref: "/download",
    popular: true,
  },
  {
    name: "pro",
    nameMessage: <FormattedMessage defaultMessage="Pro" />,
    description: (
      <FormattedMessage defaultMessage="For power users who need more transcription time." />
    ),
    price: "$9",
    period: "/month",
    features: [
      <FormattedMessage defaultMessage="5 hours/month" key="1" />,
      <FormattedMessage defaultMessage="Everything in Starter" key="2" />,
      <FormattedMessage defaultMessage="Priority processing" key="3" />,
      <FormattedMessage defaultMessage="Custom tones" key="4" />,
      <FormattedMessage defaultMessage="Priority support" key="5" />,
    ],
    cta: <FormattedMessage defaultMessage="Get Started" />,
    ctaHref: "/download",
    popular: false,
  },
  {
    name: "enterprise",
    nameMessage: <FormattedMessage defaultMessage="Enterprise" />,
    description: (
      <FormattedMessage defaultMessage="Custom solutions for teams and organizations." />
    ),
    price: null,
    features: [
      <FormattedMessage defaultMessage="Unlimited transcriptions" key="1" />,
      <FormattedMessage defaultMessage="Everything in Pro" key="2" />,
      <FormattedMessage defaultMessage="Team management" key="3" />,
      <FormattedMessage defaultMessage="SSO integration" key="4" />,
      <FormattedMessage defaultMessage="Dedicated support" key="5" />,
      <FormattedMessage defaultMessage="Custom integrations" key="6" />,
    ],
    cta: <FormattedMessage defaultMessage="Contact Us" />,
    ctaHref: "mailto:hello@voquill.com",
    popular: false,
  },
];

function PricingSection() {
  return (
    <section className={styles.pricingSection} id="pricing">
      <div className={`${pageStyles.sectionHeader} ${styles.sectionHeaderCentered}`}>
        <span className={pageStyles.badge}>
          <FormattedMessage defaultMessage="Pricing" />
        </span>
        <h2>
          <FormattedMessage defaultMessage="Simple, transparent pricing" />
        </h2>
        <p>
          <FormattedMessage defaultMessage="Start for free with local processing, or upgrade to cloud for seamless transcription anywhere." />
        </p>
      </div>

      <div className={styles.pricingGrid}>
        {pricingPlans.map((plan) => (
          <div
            key={plan.name}
            className={`${styles.pricingCard} ${plan.popular ? styles.pricingCardPopular : ""}`}
          >
            {plan.popular && (
              <span className={styles.popularBadge}>
                <FormattedMessage defaultMessage="Most Popular" />
              </span>
            )}

            <div className={styles.planHeader}>
              <h3 className={styles.planName}>{plan.nameMessage}</h3>
              <p className={styles.planDescription}>{plan.description}</p>
            </div>

            <div className={styles.priceContainer}>
              {plan.price !== null ? (
                <>
                  <span className={styles.price}>{plan.price}</span>
                  {plan.period && (
                    <span className={styles.pricePeriod}>{plan.period}</span>
                  )}
                </>
              ) : (
                <span className={styles.priceCustom}>
                  <FormattedMessage defaultMessage="Custom" />
                </span>
              )}
            </div>

            <a
              href={plan.ctaHref}
              className={styles.ctaButton}
            >
              {plan.cta}
            </a>

            <hr className={styles.featuresDivider} />

            <div className={styles.featuresSection}>
              <span className={styles.featuresLabel}>
                <FormattedMessage defaultMessage="What's included" />
              </span>
              <ul className={styles.featuresList}>
                {plan.features.map((feature, index) => (
                  <li key={index} className={styles.featureItem}>
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.trustSignal}>
        <div className={styles.trustContent}>
          <ShieldIcon />
          <span>
            <span className={styles.trustStrong}>
              <FormattedMessage defaultMessage="No credit card required" />
            </span>
            {" · "}
            <FormattedMessage defaultMessage="Cancel anytime" />
          </span>
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
