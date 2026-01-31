import { Box } from "@mui/material";
import { useAppStore } from "./store";
import { AppSideEffects } from "./components/root/AppSideEffects";
import { LoadingScreen } from "./components/root/LoadingScreen";
import Router from "./router";

function App() {
  const initialized = useAppStore((state) => state.initialized);

  return (
    <>
      <AppSideEffects />
      <Box sx={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
        {initialized ? <Router /> : <LoadingScreen />}
      </Box>
    </>
  );
}

export default App;
