export type DeepgramTestIntegrationArgs = {
  apiKey: string;
};

export const deepgramTestIntegration = ({
  apiKey,
}: DeepgramTestIntegrationArgs): Promise<boolean> => {
  return new Promise((resolve) => {
    const wsUrl =
      "wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&model=nova-3";
    const ws = new WebSocket(wsUrl, ["token", apiKey]);
    const timeout = setTimeout(() => {
      ws.close();
      resolve(false);
    }, 5000);

    ws.onopen = () => {
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };

    ws.onclose = (event) => {
      clearTimeout(timeout);
      if (event.code === 1008 || event.code === 4001 || event.code === 4003) {
        resolve(false);
      }
    };
  });
};
