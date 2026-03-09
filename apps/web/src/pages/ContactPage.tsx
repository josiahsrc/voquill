import { useIntl } from "react-intl";
import LegalPage from "./LegalPage";

function ContactPage() {
  const intl = useIntl();

  return (
    <LegalPage
      slug="contact"
      title={intl.formatMessage({
        defaultMessage: "Contact | Voquill",
      })}
      description={intl.formatMessage({
        defaultMessage:
          "Get in touch with the Voquill team for support, enterprise inquiries, or general questions.",
      })}
    />
  );
}

export default ContactPage;
