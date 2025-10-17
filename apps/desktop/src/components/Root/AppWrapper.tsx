import { Outlet } from "react-router-dom";
import { PageLayout } from "../common/PageLayout";
import { AppHeader } from "./Header";

export const AppWrapper = () => {
  return (
    <PageLayout header={<AppHeader />}>
      <Outlet />
    </PageLayout>
  );
};
