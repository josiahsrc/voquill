import { Dialog } from "@mui/material";
import { delayed, retry } from "@repo/utilities";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
  useStripe,
} from "@stripe/react-stripe-js";
import { useCallback } from "react";
import { useOnExit } from "../../hooks/helper.hooks";
import { getMemberRepo, getStripeRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { trackPaymentComplete } from "../../utils/analytics.utils";
import { registerMembers } from "../../utils/app.utils";
import { getEffectiveAuth } from "../../utils/auth.utils";

export const PaymentDialog = () => {
  const open = useAppStore((state) => state.payment.open);
  const priceId = useAppStore((state) => state.payment.priceId);
  const stripe = useStripe();

  const fetchClientSecret = useCallback(async () => {
    return getStripeRepo()?.createCheckoutSession(priceId ?? "") ?? "";
  }, [priceId]);

  const handleClose = () => {
    produceAppState((draft) => {
      draft.payment.open = false;
    });
  };

  const handleComplete = () => {
    trackPaymentComplete();

    retry({
      fn: async () => {
        const user = getEffectiveAuth().currentUser;
        if (!user) {
          throw new Error("no user signed in");
        }

        const member = await getMemberRepo().getMyMember();
        if (!member) {
          throw new Error("member not found after payment");
        }

        const plan = member.plan;
        if (plan === "free") {
          throw new Error("member plan not updated yet");
        }

        produceAppState((draft) => {
          registerMembers(draft, [member]);
        });
      },
      retries: 20,
      delay: 1000,
    });

    // close after a short delay
    delayed(3000).then(handleClose);
  };

  useOnExit(() => {
    handleClose();
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      {priceId && (
        <EmbeddedCheckoutProvider
          key={priceId}
          stripe={stripe}
          options={{
            fetchClientSecret,
            onComplete: handleComplete,
          }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      )}
    </Dialog>
  );
};
