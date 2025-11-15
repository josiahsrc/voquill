import { CheckRounded } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
  type SxProps,
} from "@mui/material";
import { MemberPlan } from "@repo/types";
import { FormattedMessage, useIntl } from "react-intl";
import { loadPrices } from "../../actions/pricing.actions";
import { useOnEnter } from "../../hooks/helper.hooks";
import { useAppStore } from "../../store";
import { getEffectivePlan } from "../../utils/member.utils";
import { getDollarPriceFromKey } from "../../utils/price.utils";

type CheckmarkRowProps = {
  children?: React.ReactNode;
  disabled?: boolean;
};

const CheckmarkRow = ({ children, disabled }: CheckmarkRowProps) => {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ opacity: disabled ? 0.3 : 1 }}
    >
      <CheckRounded />
      <Typography>{children}</Typography>
    </Stack>
  );
};

type PlanCardProps = {
  cardSx?: SxProps;
  buttonSx?: SxProps;
  buttonVariant?: "contained" | "outlined" | "text";
  title?: React.ReactNode;
  price?: React.ReactNode;
  children?: React.ReactNode;
  color?: string;
  disabled?: boolean;
  button?: React.ReactNode;
};

const PlanCard = ({
  cardSx,
  title,
  price,
  children,
  color,
  button,
}: PlanCardProps) => {
  return (
    <Card
      sx={{
        width: { xs: "100%", sm: 350 },
        border: "3px solid",
        borderColor: color ?? "transparent",
        backgroundColor: "level0",
        ...cardSx,
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 1,
          p: 2.5,
        }}
      >
        <Typography variant="subtitle1">{title}</Typography>
        <Typography variant="h4">{price}</Typography>
        <Box sx={{ mt: 1, mb: 2 }}>{button}</Box>
        {children}
      </CardContent>
    </Card>
  );
};

export type PlanListProps = {
  onSelect: (plan: MemberPlan) => void;
  disabled?: boolean;
  text?: string;
  sx?: SxProps;
  ignoreCurrentPlan?: boolean;
};

export const PlanList = ({
  onSelect,
  sx,
  text,
  disabled,
  ignoreCurrentPlan,
}: PlanListProps) => {
  const intl = useIntl();
  const effectivePlan = useAppStore(getEffectivePlan);

  const proPrice = useAppStore((state) =>
    getDollarPriceFromKey(state, "pro_monthly")
  );

  useOnEnter(() => {
    loadPrices();
  });

  const getText = (plan: MemberPlan) => {
    if (effectivePlan === plan && !ignoreCurrentPlan) {
      return { text: intl.formatMessage({ defaultMessage: "Current plan" }), disabled: true };
    }

    return {
      text: text ?? intl.formatMessage({ defaultMessage: "Continue" }),
      disabled,
    };
  };

  const communityCard = (
    <PlanCard
      title={<FormattedMessage defaultMessage="Community" />}
      price={<FormattedMessage defaultMessage="Free" />}
      buttonVariant="outlined"
      cardSx={{ borderColor: "level1" }}
      button={
        <Button
          variant="outlined"
          onClick={() => onSelect("free")}
          disabled={getText("free").disabled}
          fullWidth
        >
          {getText("free").text}
        </Button>
      }
    >
      <CheckmarkRow><FormattedMessage defaultMessage="On-device processing" /></CheckmarkRow>
      <CheckmarkRow><FormattedMessage defaultMessage="Unlimited words" /></CheckmarkRow>
      <CheckmarkRow><FormattedMessage defaultMessage="Custom API keys" /></CheckmarkRow>
      <CheckmarkRow disabled><FormattedMessage defaultMessage="Manual setup" /></CheckmarkRow>
    </PlanCard>
  );

  const proCard = (
    <PlanCard
      title={<FormattedMessage defaultMessage="Pro" />}
      price={proPrice ? intl.formatMessage({ defaultMessage: "${proPrice}/month" }, { proPrice }) : "--"}
      cardSx={{ borderColor: "primary.main" }}
      button={
        <Button
          variant="contained"
          onClick={() => onSelect("pro")}
          disabled={getText("pro").disabled}
          fullWidth
        >
          {getText("pro").text}
        </Button>
      }
    >
      <CheckmarkRow><FormattedMessage defaultMessage="Everything community has" /></CheckmarkRow>
      <CheckmarkRow><FormattedMessage defaultMessage="Cross-device data storage" /></CheckmarkRow>
      <CheckmarkRow><FormattedMessage defaultMessage="No setup needed" /></CheckmarkRow>
      <CheckmarkRow><FormattedMessage defaultMessage="Priority support" /></CheckmarkRow>
    </PlanCard>
  );

  return (
    <Stack
      sx={{
        flexDirection: "row",
        gap: 2,
        alignItems: "stretch",
        justifyContent: "center",
        flexWrap: "wrap",
        ...sx,
      }}
    >
      {communityCard}
      {proCard}
    </Stack>
  );
};
