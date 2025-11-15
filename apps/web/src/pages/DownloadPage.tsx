import { useIntl } from "react-intl";
import DownloadPageContent from "../components/download-page-content";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";

function DownloadPage() {
  const intl = useIntl();

  return (
    <BaseLayout
      title={intl.formatMessage({ defaultMessage: "Download Voquill" })}
      description={intl.formatMessage({
        defaultMessage:
          "Install Voquill on macOS, Windows, or Linux and start dictating with AI today.",
      })}
    >
      <PageLayout>
        <DownloadPageContent />
      </PageLayout>
    </BaseLayout>
  );
}

export default DownloadPage;
