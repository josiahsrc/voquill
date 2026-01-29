import { setAuthToken } from "../../actions/login.actions";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import { produceAppState } from "../../store";
import { invoke } from "../../utils/api.utils";

const TEN_MINUTES = 10 * 60 * 1000;

export const AppSideEffects = () => {
  useIntervalAsync(TEN_MINUTES, async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    produceAppState((draft) => {
      draft.token = token;
    });

    try {
      const data = await invoke("auth/refresh", {});
      setAuthToken(data.token);
      produceAppState((draft) => {
        draft.initialized = true;
      });
    } catch {
      localStorage.removeItem("token");
    }
  }, []);

  return null;
};
