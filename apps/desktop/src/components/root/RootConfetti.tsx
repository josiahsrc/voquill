import Confetti from "react-confetti";
import { useEffectDebounced, useWindowSize } from "../../hooks/helper.hooks";
import { produceAppState, useAppStore } from "../../store";

export const RootConfetti = () => {
  const { width, height } = useWindowSize();
  const counter = useAppStore((state) => state.confettiCounter);

  useEffectDebounced(
    10_000,
    () => {
      if (counter > 0) {
        produceAppState((draft) => {
          draft.confettiCounter = 0;
        });
      }
    },
    [counter],
  );

  if (counter <= 0) {
    return null;
  }

  return (
    <Confetti width={width} height={height} key={counter} recycle={false} />
  );
};
