import { Dialog } from "@mui/material";
import { invokeHandler } from "@repo/functions";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
  useStripe,
} from "@stripe/react-stripe-js";
import { useCallback } from "react";
import { useOnExit } from "../../hooks/helper.hooks";
import { produceAppState, useAppStore } from "../../store";

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
          }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      )}
    </Dialog>
  );
};
