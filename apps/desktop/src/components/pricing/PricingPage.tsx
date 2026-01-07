import { Box, Stack, Typography } from "@mui/material";
import { useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";
import { tryOpenPaymentDialogForPricingPlan } from "../../actions/payment.actions";
import { usePrevious } from "../../hooks/helper.hooks";
import { useConsumeQueryParams } from "../../hooks/navigation.hooks";
import { getAppState, useAppStore } from "../../store";
import { getIsPaying, getMyMember } from "../../utils/member.utils";
import { PricingPlan } from "../../utils/price.utils";
import { getIsSignedIn, getMyUser } from "../../utils/user.utils";
import { Faq } from "./Faq";
import Liquid from "./Liquid";
import { PlanList } from "./PlanList";

export default function PricingPage() {
  const nav = useNavigate();
  const intl = useIntl();
  const onboarded = useAppStore(
    (state) => getMyUser(state)?.onboarded ?? false,
  );
  const isPaying = useAppStore(getIsPaying);
  const currPlan = useAppStore((state) => getMyMember(state)?.plan);
  const prevPlan = usePrevious(currPlan);

  useEffect(() => {
    if (isPaying && currPlan !== prevPlan && prevPlan) {
      nav("/dashboard", { replace: true });
    }
  }, [isPaying, currPlan, prevPlan]);

  useConsumeQueryParams(["plan"], ([plan]) => {
    tryOpenPaymentDialogForPricingPlan(plan);
  });

  const handleClickPlan = (plan: PricingPlan) => {
    const isSignedIn = getIsSignedIn(getAppState());
    if (isSignedIn) {
      tryOpenPaymentDialogForPricingPlan(plan);
    } else {
      nav(`/login?plan=${plan}`, { replace: true });
    }
  };

  let title: React.ReactNode;
  let subtitle: React.ReactNode;
  if (onboarded) {
    title = <FormattedMessage defaultMessage="Upgrade your plan" />;
    subtitle = (
      <FormattedMessage defaultMessage="Get access to the full feature set by upgrading your plan." />
    );
  } else {
    title = <FormattedMessage defaultMessage="Try it free. Upgrade anytime." />;
    subtitle = (
      <FormattedMessage defaultMessage="No credit card required. Get started today and upgrade when you're ready." />
    );
  }

  const plans = (
    <Stack
      sx={{
        justifyContent: "center",
        alignItems: "center",
        p: 4,
        pb: 16,
        gap: 1,
        minHeight: "80vh",
      }}
    >
      <Typography variant="h4" textAlign="center">
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" textAlign="center">
        {subtitle}
      </Typography>
      <PlanList
        onSelect={handleClickPlan}
        text={
          onboarded
            ? intl.formatMessage({ defaultMessage: "Subscribe" })
            : intl.formatMessage({ defaultMessage: "Continue" })
        }
        sx={{
          mt: 4,
          mb: 2,
        }}
      />
    </Stack>
  );

  return (
    <Stack sx={{ pb: 16 }}>
      <Liquid duration={80}>
        <Box
          sx={{
            background: (t) =>
              `radial-gradient(circle, ${t.palette.background.default} 10%, transparent 100%)`,
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
          }}
        >
          {plans}
        </Box>
      </Liquid>
      <Faq sx={{ mt: 2, mb: 2 }} />
    </Stack>
  );
}
