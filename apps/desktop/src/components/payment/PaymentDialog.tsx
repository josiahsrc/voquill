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
          console.log("no user signed in after payment");
          throw new Error("no user signed in");
        }

        const claims = await user.getIdTokenResult(true);
        const subscribed = claims.claims.subscribed === true;
        if (!subscribed) {
          console.log("user not subscribed yet, will retry");
          throw new Error("user not subscribed yet");
        }

        const member = await invokeHandler("member/getMyMember", {}).then(
          (res) => res.member
        );

        console.log("retrieved member after payment:", member);
        if (member) {
          produceAppState((draft) => {
            registerMembers(draft, [member]);
          });
        }
      },
      retries: 10,
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
