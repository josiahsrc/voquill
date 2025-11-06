import DownloadPageContent from "../components/download-page-content";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";

function DownloadPage() {
  return (
    <BaseLayout
      title="Download Voquill"
      description="Install Voquill on macOS, Windows, or Linux and start dictating with AI today."
    >
      <PageLayout>
        <DownloadPageContent />
      </PageLayout>
    </BaseLayout>
  );
}

export default DownloadPage;
