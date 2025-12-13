import Confetti from "react-confetti";
import { useWindowSize } from "../../hooks/helper.hooks";
import { useAppStore } from "../../store";

export const RootConfetti = () => {
  const { width, height } = useWindowSize();
  const counter = useAppStore((state) => state.confettiCounter);
  if (counter <= 0) {
    return null;
  }

  return (
    <Confetti width={width} height={height} key={counter} recycle={false} />
  );
};
