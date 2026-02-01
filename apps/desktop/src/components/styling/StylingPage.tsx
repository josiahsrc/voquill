import { useAppStore } from "../../store";
import { getEffectiveStylingMode } from "../../utils/feature.utils";
import { AppStylingLayout } from "./AppStylingLayout";
import { ManualStylingLayout } from "./ManualStylingLayout";

export default function StylingPage() {
  const stylingMode = useAppStore((state) => getEffectiveStylingMode(state));
  if (stylingMode === "manual") {
    return <ManualStylingLayout />;
  }

  return <AppStylingLayout />;
}
