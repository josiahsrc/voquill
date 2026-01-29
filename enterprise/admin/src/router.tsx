import { Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { LoadingScreen } from "./components/root/LoadingScreen";
import { Guard } from "./components/routing/Guard";
import { lazyLoad } from "./utils/lazy.utils";

const HomePage = lazyLoad(() => import("./components/home/HomePage"));
const LoginPage = lazyLoad(() => import("./components/login/LoginPage"));
const PermissionDeniedPage = lazyLoad(
  () => import("./components/permission-denied/PermissionDeniedPage"),
);
const UsersTab = lazyLoad(() => import("./components/users/UsersTab"));
const TermsTab = lazyLoad(() => import("./components/terms/TermsTab"));
const SttProvidersTab = lazyLoad(
  () => import("./components/stt-providers/SttProvidersTab"),
);
const LlmProvidersTab = lazyLoad(
  () => import("./components/llm-providers/LlmProvidersTab"),
);
const SettingsTab = lazyLoad(() => import("./components/settings/SettingsTab"));

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Guard node="home">
        <HomePage />
      </Guard>
    ),
    children: [
      { index: true, element: <Navigate to="/users" replace /> },
      { path: "users", element: <UsersTab /> },
      { path: "terms", element: <TermsTab /> },
      { path: "stt-providers", element: <SttProvidersTab /> },
      { path: "llm-providers", element: <LlmProvidersTab /> },
      { path: "settings", element: <SettingsTab /> },
    ],
  },
  {
    path: "/login",
    element: (
      <Guard node="login">
        <LoginPage />
      </Guard>
    ),
  },
  {
    path: "/permission-denied",
    element: (
      <Guard node="permissionDenied">
        <PermissionDeniedPage />
      </Guard>
    ),
  },
]);

export default function Router() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
