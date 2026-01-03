import { AgentOverlayRend } from "./AgentOverlayRend";
import { AgentOverlaySideEffects } from "./AgentOverlaySideEffects";

export const AgentOverlayRoot = () => {
  return (
    <>
      <AgentOverlayRend />
      <AgentOverlaySideEffects />
    </>
  );
};
