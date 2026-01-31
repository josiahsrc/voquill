import { invokeHandler } from "@repo/functions";
import { Member, Nullable } from "@repo/types";
import { invokeEnterprise } from "../utils/enterprise.utils";
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

export class EnterpriseMemberRepo extends BaseMemberRepo {
  async tryInitialize(): Promise<void> {
    await invokeEnterprise("member/tryInitialize", {});
  }

  async getMyMember(): Promise<Nullable<Member>> {
    const res = await invokeEnterprise("member/getMyMember", {});
    return res.member;
  }
}
