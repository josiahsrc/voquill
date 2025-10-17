import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import SettingsPage from "./components/Settings/SettingsPage.tsx";
import { PageLayout } from "./components/Common/PageLayout.tsx";
import HomePage from "./components/Home/HomePage.tsx";
import OnboardingPage from "./components/Onboarding/OnboardingPage.tsx";
import ErrorBoundary from "./components/Root/ErrorBoundary.tsx";
import { AppHeader } from "./components/Root/Header.tsx";
import Root from "./components/Root/Root.tsx";
import { Guard } from "./components/Routing/Guard.tsx";
import { Redirect } from "./components/Routing/Redirectors.tsx";
import DashboardPage from "./components/Dashboard/DashboardPage.tsx";
import TranscriptionsPage from "./components/Transcriptions/TranscriptionsPage.tsx";

const AppWrapper = () => {
  return (
    <PageLayout header={<AppHeader />}>
      <Outlet />
    </PageLayout>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Redirect to="/dashboard" />,
      },
      {
        element: (
          <Guard node="onboarding">
            <AppWrapper />
          </Guard>
        ),
        children: [
          {
            path: "onboarding",
            element: <OnboardingPage />,
          },
        ],
      },
      {
        element: (
          <Guard node="dashboard">
            <AppWrapper />
          </Guard>
        ),
        children: [
          {
            path: "dashboard",
            element: <DashboardPage />,
            children: [
              {
                index: true,
                element: <HomePage />,
              },
              {
                path: "settings",
                element: <SettingsPage />,
              },
              {
                path: "transcriptions",
                element: <TranscriptionsPage />,
              },
            ],
          },
        ],
      },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
