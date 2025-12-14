import { Dialog } from "@mui/material";
import { invokeHandler } from "@repo/functions";
import { delayed, retry } from "@repo/utilities";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
  useStripe,
} from "@stripe/react-stripe-js";
import { getAuth } from "firebase/auth";
import { useCallback } from "react";
import { useOnExit } from "../../hooks/helper.hooks";
import { produceAppState, useAppStore } from "../../store";
import { registerMembers } from "../../utils/app.utils";

export const PaymentDialog = () => {
  const open = useAppStore((state) => state.payment.open);
  const priceId = useAppStore((state) => state.payment.priceId);
  const stripe = useStripe();

  const fetchClientSecret = useCallback(async () => {
    const res = await invokeHandler("stripe/createCheckoutSession", {
      priceId: priceId ?? "",
    });
    return res.clientSecret;
  }, [priceId]);

  const handleClose = () => {
    produceAppState((draft) => {
      draft.payment.open = false;
    });
  };

  const handleComplete = () => {
    // retrieve the member (process is async so we retry a few times)
    retry({
      fn: async () => {
        const user = getAuth().currentUser;
        if (!user) {
          throw new Error("no user signed in");
        }

        const member = await invokeHandler("member/getMyMember", {}).then(
          (res) => res.member,
        );
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
