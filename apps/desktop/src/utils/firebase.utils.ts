import { getIsEmulators } from "./env.utils";

export function getFunctionUrl(functionName: string): string {
  const projectId =
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "voquill-dev";
  if (getIsEmulators()) {
    return `http://localhost:5001/${projectId}/us-central1/${functionName}`;
  }
  return `https://us-central1-${projectId}.cloudfunctions.net/${functionName}`;
}
