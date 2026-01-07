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
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <Confetti width={width} height={height} key={counter} recycle={false} />
    </div>
  );
};
