import { useIntl } from "react-intl";
import LegalPage from "./LegalPage";

function TermsPage() {
  const intl = useIntl();

  return (
    <LegalPage
      slug="terms"
      title={intl.formatMessage({
        defaultMessage: "Terms of Service | Voquill",
      })}
      description={intl.formatMessage({
        defaultMessage:
          "Review the terms of service for using Voquill's voice-first keyboard and transcription tools.",
      })}
    />
  );
}

export default TermsPage;
