import { CheckRounded } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  Typography,
  type SxProps,
} from "@mui/material";
import { MemberPlan } from "@repo/types";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { loadPrices } from "../../actions/pricing.actions";
import { useOnEnter } from "../../hooks/helper.hooks";
import { useAppStore } from "../../store";
import { getEffectivePlan } from "../../utils/member.utils";
import { getDollarPriceFromKey, PricingPlan } from "../../utils/price.utils";

type CheckmarkRowProps = {
  children?: React.ReactNode;
  disabled?: boolean;
};

const CheckmarkRow = ({ children, disabled }: CheckmarkRowProps) => {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{ opacity: disabled ? 0.3 : 1 }}
    >
      <CheckRounded sx={{ fontSize: 16 }} />
      <Typography variant="body2">{children}</Typography>
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
        width: { xs: "100%", sm: 260 },
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
          gap: 0.25,
          p: 1.5,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" fontWeight={600}>
          {price}
        </Typography>
        <Box sx={{ mt: 1, mb: 1.5 }}>{button}</Box>
        {children}
      </CardContent>
    </Card>
  );
};

type BillingToggleProps = {
  isYearly: boolean;
  onToggle: () => void;
};

const BillingToggle = ({ isYearly, onToggle }: BillingToggleProps) => {
  return (
    <Stack alignItems="center" sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Typography
          sx={{
            fontSize: "0.85rem",
            fontWeight: 500,
            color: !isYearly ? "text.primary" : "text.secondary",
            transition: "color 0.2s ease",
          }}
        >
          <FormattedMessage defaultMessage="Monthly" />
        </Typography>
        <Box
          component="button"
          onClick={onToggle}
          sx={{
            position: "relative",
            width: 44,
            height: 22,
            borderRadius: 999,
            backgroundColor: "level2",
            border: "1px solid",
            borderColor: "divider",
            cursor: "pointer",
            transition: "background 0.2s ease",
            "&:hover": {
              backgroundColor: "level3",
            },
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 2,
              left: 2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: "text.primary",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: isYearly ? "translateX(22px)" : "translateX(0)",
            }}
          />
        </Box>
        <Typography
          sx={{
            fontSize: "0.85rem",
            fontWeight: 500,
            color: isYearly ? "text.primary" : "text.secondary",
            transition: "color 0.2s ease",
          }}
        >
          <FormattedMessage defaultMessage="Yearly" />
        </Typography>
        <Box
          sx={{
            py: 0.25,
            px: 1,
            borderRadius: 999,
            backgroundColor: "rgba(34, 197, 94, 0.12)",
            border: "1px solid rgba(34, 197, 94, 0.2)",
            color: "#22c55e",
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          <FormattedMessage defaultMessage="Save 33%" />
        </Box>
      </Stack>
    </Stack>
  );
};

export type PlanListProps = {
  onSelect: (plan: PricingPlan) => void;
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
  const [isYearly, setIsYearly] = useState(true);

  const proMonthlyPrice = useAppStore((state) =>
    getDollarPriceFromKey(state, "pro_monthly"),
  );
  const proYearlyPrice = useAppStore((state) =>
    getDollarPriceFromKey(state, "pro_yearly"),
  );
  const freeWordsPerDay = useAppStore(
    (state) => state.config?.freeWordsPerDay ?? 1_000,
  );

  const proYearlyPerMonth = proYearlyPrice
    ? Math.round(proYearlyPrice / 12)
    : null;
  const displayPrice = isYearly ? proYearlyPerMonth : proMonthlyPrice;
  const yearlyTotal = proYearlyPrice;

  useOnEnter(() => {
    loadPrices();
  });

  const getText = (plan: MemberPlan) => {
    if (effectivePlan === plan && !ignoreCurrentPlan) {
      return {
        text: intl.formatMessage({ defaultMessage: "Current plan" }),
        disabled: true,
      };
    }

    return {
      text: text ?? intl.formatMessage({ defaultMessage: "Continue" }),
      disabled,
    };
  };

  const trialCard = (
    <PlanCard
      title={<FormattedMessage defaultMessage="Trial" />}
      price={
        <Stack>
          <Typography variant="h5" fontWeight={600}>
            <FormattedMessage defaultMessage="Free" />
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <FormattedMessage defaultMessage="No credit card required" />
          </Typography>
        </Stack>
      }
      buttonVariant="outlined"
      cardSx={{ borderColor: "level1" }}
      button={
        <Button
          variant="outlined"
          size="small"
          onClick={() => onSelect("free")}
          disabled={getText("free").disabled}
          fullWidth
          sx={{ py: 0.5 }}
        >
          {getText("free").text}
        </Button>
      }
    >
      <CheckmarkRow>
        <FormattedMessage
          defaultMessage="{freeWordsPerDay, number} free words per day"
          values={{ freeWordsPerDay }}
        />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Commercial use" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="AI dictation" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Cross-device data storage" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Community support" />
      </CheckmarkRow>
      <CheckmarkRow disabled>
        <FormattedMessage defaultMessage="Basic agent mode" />
      </CheckmarkRow>
    </PlanCard>
  );

  const proCard = (
    <PlanCard
      title={<FormattedMessage defaultMessage="Pro" />}
      price={
        <Stack>
          <Typography variant="h5" fontWeight={600}>
            {displayPrice
              ? intl.formatMessage(
                  { defaultMessage: "${displayPrice}/month" },
                  { displayPrice },
                )
              : "--"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isYearly && yearlyTotal ? (
              <FormattedMessage
                defaultMessage="Billed annually (${total}/year)"
                values={{ total: yearlyTotal }}
              />
            ) : (
              <FormattedMessage defaultMessage="Billed monthly" />
            )}
          </Typography>
        </Stack>
      }
      cardSx={{ borderColor: "primary.main" }}
      button={
        <Button
          variant="blue"
          size="small"
          onClick={() => onSelect(isYearly ? "pro_yearly" : "pro_monthly")}
          disabled={getText("pro").disabled}
          fullWidth
          sx={{ py: 0.5 }}
        >
          {getText("pro").text}
        </Button>
      }
    >
      <CheckmarkRow disabled>
        <FormattedMessage defaultMessage="Everything the trial has" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Unlimited words per month" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Access to beta features" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Advanced agent mode" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="MCP integrations" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Priority support" />
      </CheckmarkRow>
    </PlanCard>
  );

  const enterpriseCard = (
    <PlanCard
      title={<FormattedMessage defaultMessage="Enterprise" />}
      price={
        <Stack>
          <Typography variant="h5" fontWeight={600}>
            <FormattedMessage defaultMessage="Custom" />
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <FormattedMessage defaultMessage="Contact for pricing" />
          </Typography>
        </Stack>
      }
      cardSx={{ borderColor: "level1" }}
      button={
        <Button
          variant="outlined"
          size="small"
          component={Link}
          href="mailto:hello@voquill.com"
          fullWidth
          sx={{ py: 0.5 }}
        >
          <FormattedMessage defaultMessage="Contact us" />
        </Button>
      }
    >
      <CheckmarkRow disabled>
        <FormattedMessage defaultMessage="Everything in Pro" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="On-premise deployment" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Custom integrations" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Data privacy & compliance" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Dedicated support" />
      </CheckmarkRow>
      <CheckmarkRow>
        <FormattedMessage defaultMessage="Bring your own cloud" />
      </CheckmarkRow>
    </PlanCard>
  );

  return (
    <Stack
      sx={{
        flexDirection: "column",
        alignItems: "center",
        ...sx,
      }}
    >
      <BillingToggle
        isYearly={isYearly}
        onToggle={() => setIsYearly(!isYearly)}
      />
      <Stack
        sx={{
          flexDirection: "row",
          gap: 2,
          alignItems: "stretch",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {trialCard}
        {proCard}
        {enterpriseCard}
      </Stack>
    </Stack>
  );
};
