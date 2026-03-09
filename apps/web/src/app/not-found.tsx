import type { Metadata } from "next";
import NotFoundPage from "../views/NotFoundPage";

export const metadata: Metadata = {
  robots: "noindex,nofollow",
};

export default function NotFound() {
  return <NotFoundPage />;
}
