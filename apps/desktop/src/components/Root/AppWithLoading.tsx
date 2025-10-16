import { useEffect } from "react";
import Router from "../../router";
import { produceAppState, useAppStore } from "../../store";
import { LoadingApp } from "./LoadingApp";

export const AppWithLoading = () => {
	const initialized = useAppStore((state) => state.initialized);
  console.log("App initialized:", initialized);

	useEffect(() => {
		if (!initialized) {
			produceAppState((draft) => {
				draft.initialized = true;
			});
		}
	}, [initialized]);

	return initialized ? <Router /> : <LoadingApp />;
};
