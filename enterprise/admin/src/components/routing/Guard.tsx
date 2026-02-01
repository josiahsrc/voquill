import { useMemo } from "react";
import { useAppStore } from "../../store";
import { Redirect } from "./Redirect";

export type Node = "home" | "login" | "permissionDenied";

type GuardState = {
  isLoggedIn: boolean;
  isAdmin: boolean;
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
  home: {
    edges: [
      {
        to: "login",
        condition: (s) => !s.isLoggedIn,
      },
      {
        to: "permissionDenied",
        condition: (s) => s.isLoggedIn && !s.isAdmin,
      },
    ],
    builder: () => <Redirect to="/users" />,
  },
  login: {
    edges: [
      {
        to: "home",
        condition: (s) => s.isLoggedIn && s.isAdmin,
      },
      {
        to: "permissionDenied",
        condition: (s) => s.isLoggedIn && !s.isAdmin,
      },
    ],
    builder: () => <Redirect to="/login" />,
  },
  permissionDenied: {
    edges: [
      {
        to: "login",
        condition: (s) => !s.isLoggedIn,
      },
      {
        to: "home",
        condition: (s) => s.isLoggedIn && s.isAdmin,
      },
    ],
    builder: () => <Redirect to="/permission-denied" />,
  },
};

export type GuardProps = {
  children: React.ReactNode;
  node: Node;
};

export const Guard = ({ children, node }: GuardProps) => {
  const auth = useAppStore((state) => state.auth);

  const state = useMemo<GuardState>(
    () => ({
      isLoggedIn: auth !== null,
      isAdmin: auth?.isAdmin ?? false,
    }),
    [auth],
  );

  const redirectTo = useMemo(() => {
    const edges = graph[node]?.edges ?? [];
    for (const edge of edges) {
      if (edge.condition(state)) {
        return edge.to;
      }
    }
    return null;
  }, [node, state]);

  if (redirectTo) {
    const builder = graph[redirectTo]?.builder;
    if (builder) {
      return builder(state);
    }
  }

  return children;
};
