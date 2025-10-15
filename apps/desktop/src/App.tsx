import { CssBaseline, ThemeProvider } from "@mui/material";
import {
  Navigate,
  RouterProvider,
  createMemoryRouter,
} from "react-router-dom";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { DashboardHome } from "./components/dashboard/DashboardHome";
import { LegacyPage } from "./components/legacy/LegacyPage";
import { theme } from "./theme";

const router = createMemoryRouter(
  [
    {
      path: "/",
      element: <DashboardLayout />,
      children: [
        {
          index: true,
          element: <DashboardHome />,
        },
        {
          path: "legacy",
          element: <LegacyPage />,
        },
      ],
    },
    {
      path: "*",
      element: <Navigate to="/" replace />,
    },
  ],
  {
    initialEntries: ["/"],
  },
);

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
