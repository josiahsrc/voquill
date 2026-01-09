import { Fragment, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import ScrollToTop from "./components/scroll-to-top";
import { trackPageView } from "./utils/analytics.utils";
import DownloadPage from "./pages/DownloadPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";

function App() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <Fragment>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Fragment>
  );
}

export default App;
