import { Outlet } from "react-router-dom";
import { PageLayout } from "../Common/PageLayout";
import { AppHeader } from "./Header";

export const AppWrapper = () => {
  return (
    <PageLayout header={<AppHeader />}>
      <Outlet />
    </PageLayout>
  );
};
