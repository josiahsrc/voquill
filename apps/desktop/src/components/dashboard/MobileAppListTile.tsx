import { PhoneIphoneOutlined } from "@mui/icons-material";
import { FormattedMessage } from "react-intl";
import { useLocalStorage } from "../../hooks/local-storage.hooks";
import { produceAppState } from "../../store";
import { ListTile } from "../common/ListTile";

const MOBILE_APP_SEEN_KEY = "mobile-app-tile-seen2";

export const MobileAppListTile = () => {
  const [seen, setSeen] = useLocalStorage(MOBILE_APP_SEEN_KEY, false);

  const handleClick = () => {
    setSeen(true);
    produceAppState((draft) => {
      draft.settings.mobileAppDialogOpen = true;
    });
  };

  return (
    <ListTile
      onClick={handleClick}
      leading={<PhoneIphoneOutlined />}
      title={<FormattedMessage defaultMessage="Now on mobile!" />}
      sx={{
        position: "relative",
        borderRadius: 1,
        border: "1px solid rgba(255, 255, 255, 0.2)",
        overflow: "visible",
        ...(!seen && {
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            padding: "1px",
            background:
              "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer-mobile 3s ease-in-out infinite",
            willChange: "transform",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            pointerEvents: "none",
          },
          "&::after": {
            content: '"New"',
            position: "absolute",
            top: -8,
            right: 10,
            zIndex: 1,
            pointerEvents: "none",
            fontSize: "0.625rem",
            fontWeight: 700,
            lineHeight: 1,
            color: "#000",
            backgroundColor: "#fff",
            borderRadius: "8px",
            padding: "3px 6px",
          },
          "@keyframes shimmer-mobile": {
            "0%": { backgroundPosition: "200% 0" },
            "100%": { backgroundPosition: "-200% 0" },
          },
        }),
      }}
    />
  );
};
