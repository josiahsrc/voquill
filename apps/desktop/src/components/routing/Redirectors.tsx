import { Navigate, useSearchParams } from "react-router-dom";

export type RedirectProps = {
  to: string;
  state?: unknown;
};

export function Redirect({ to, state }: RedirectProps) {
  const [params] = useSearchParams();

  return (
    <Navigate to={`${to}?${params.toString()}`} replace={true} state={state} />
  );
}
