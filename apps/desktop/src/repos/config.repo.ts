import { HandlerOutput, invokeHandler } from "@repo/functions";
import { Nullable } from "@repo/types";
import { BaseRepo } from "./base.repo";

type Config = HandlerOutput<"config/getFullConfig">["config"];

export abstract class BaseConfigRepo extends BaseRepo {
  abstract getFullConfig(): Promise<Nullable<Config>>;
}

export class CloudConfigRepo extends BaseConfigRepo {
  async getFullConfig(): Promise<Nullable<Config>> {
    const res = await invokeHandler("config/getFullConfig", {});
    return res.config;
  }
}
