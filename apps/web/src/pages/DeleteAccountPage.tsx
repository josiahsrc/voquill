import { useIntl } from "react-intl";
import LegalPage from "./LegalPage";

function DeleteAccountPage() {
  const intl = useIntl();

  return (
    <LegalPage
      slug="delete-account"
      title={intl.formatMessage({
        defaultMessage: "Delete Account | Voquill",
      })}
      description={intl.formatMessage({
        defaultMessage: "Learn how to delete your Voquill account.",
      })}
    />
  );
}

export default DeleteAccountPage;
