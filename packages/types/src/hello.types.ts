export type HelloRight = {
  message: string;
  timestamp: Date;
  isRight: boolean;
};

export const createHelloRight = (message: string = "Hello Right!"): HelloRight => ({
  message,
  timestamp: new Date(),
  isRight: true,
});