import { invokeHandler } from "@repo/functions";
import { Member, Nullable } from "@repo/types";
import { BaseRepo } from "./base.repo";

export abstract class BaseMemberRepo extends BaseRepo {
  abstract tryInitialize(): Promise<void>;
  abstract getMyMember(): Promise<Nullable<Member>>;
}

export class CloudMemberRepo extends BaseMemberRepo {
  async tryInitialize(): Promise<void> {
    await invokeHandler("member/tryInitialize", {});
  }

  async getMyMember(): Promise<Nullable<Member>> {
    const res = await invokeHandler("member/getMyMember", {});
    return res.member;
  }
}
