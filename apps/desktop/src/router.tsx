import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import SettingsPage from "./components/settings/SettingsPage.tsx";
import { PageLayout } from "./components/common/PageLayout.tsx";
import HomePage from "./components/home/HomePage.tsx";
import OnboardingPage from "./components/onboarding/OnboardingPage.tsx";
import ErrorBoundary from "./components/root/ErrorBoundary.tsx";
import { AppHeader } from "./components/root/Header.tsx";
import Root from "./components/root/Root.tsx";
import { Guard } from "./components/routing/Guard.tsx";
import { Redirect } from "./components/routing/Redirectors.tsx";
import DashboardPage from "./components/dashboard/DashboardPage.tsx";
import TranscriptionsPage from "./components/transcriptions/TranscriptionsPage.tsx";
import DictionaryPage from "./components/dictionary/DictionaryPage.tsx";
import PlansPage from "./components/plans/PlansPage.tsx";

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
              {
                path: "dictionary",
                element: <DictionaryPage />,
              },
              {
                path: "plans",
                element: <PlansPage />,
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
