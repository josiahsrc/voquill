import { useMemo } from "react";
import { useIsOnboarded } from "../../hooks/user.hooks";
import { Redirect } from "./Redirectors";
import { getRec } from "@repo/utilities";
import { useAppStore } from "../../store";
import { getIsLoggedIn } from "../../utils/user.utils";

export type Node = "dashboard" | "notFound" | "onboarding" | "welcome";

type GuardState = {
  isOnboarded: boolean;
  isLoggedIn: boolean;
};

type GuardEdge = {
  to: Node;
  condition: (state: GuardState) => boolean;
};

type NodeDefinition = {
  edges: GuardEdge[];
  builder: (state: GuardState) => React.ReactNode;
};

type Graph = Record<Node, NodeDefinition>;

const graph: Graph = {
  welcome: {
    edges: [
      {
        to: "dashboard",
        condition: (s) => s.isOnboarded,
      },
      {
        to: "onboarding",
        condition: (s) => s.isLoggedIn && !s.isOnboarded,
      },
    ],
    builder: () => <Redirect to="/welcome" />,
  },
  onboarding: {
    edges: [
      {
        to: "dashboard",
        condition: (s) => s.isOnboarded,
      },
    ],
    builder: () => <Redirect to="/onboarding" />,
  },
  dashboard: {
    edges: [
      {
        to: "welcome",
        condition: (s) => !s.isOnboarded,
      },
    ],
    builder: () => <Redirect to="/dashboard" />,
  },
  notFound: {
    edges: [],
    builder: () => <Redirect to="/not-found" />,
  },
};

export type GuardProps = {
  children: React.ReactNode;
  node: Node;
};

export const Guard = ({ children, node }: GuardProps) => {
  const isOnboarded = useIsOnboarded();
  const isLoggedIn = useAppStore(getIsLoggedIn);

  const state = useMemo<GuardState>(
    () => ({
      isOnboarded,
      isLoggedIn,
    }),
    [isOnboarded, isLoggedIn],
  );

  const redirectTo = useMemo(() => {
    const edges = getRec(graph, node)?.edges ?? [];
    for (const edge of edges) {
      if (edge.condition(state)) {
        return edge.to;
      }
    }

    return null;
  }, [node, state]);

  if (redirectTo) {
    const builder = getRec(graph, redirectTo)?.builder;
    if (builder) {
      return builder(state);
    }
  }

  return children;
};
