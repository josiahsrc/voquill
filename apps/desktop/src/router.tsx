import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import AccountPage from "./components/Account/AccountPage.tsx";
import { PageLayout } from "./components/Common/PageLayout.tsx";
import HomePage from "./components/Home/HomePage.tsx";
import OnboardingPage from "./components/Onboarding/OnboardingPage.tsx";
import ErrorBoundary from "./components/Root/ErrorBoundary.tsx";
import { AppHeader } from "./components/Root/Header.tsx";
import Root from "./components/Root/Root.tsx";
import { Guard } from "./components/Routing/Guard.tsx";
import { Redirect } from "./components/Routing/Redirectors.tsx";
import DashboardPage from "./components/Dashboard/DashboardPage.tsx";

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
                path: "account",
                element: <AccountPage />,
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
