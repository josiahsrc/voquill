import { useIntl } from "react-intl";
import LegalPage from "./LegalPage";

function PrivacyPage() {
  const intl = useIntl();

  return (
    <LegalPage
      slug="privacy"
      title={intl.formatMessage({
        defaultMessage: "Privacy Policy | Voquill",
      })}
      description={intl.formatMessage({
        defaultMessage:
          "Learn how Voquill collects, processes, and protects information across our local-first AI dictation platform.",
      })}
    />
  );
}

export default PrivacyPage;
