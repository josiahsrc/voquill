import type { ToolPermission } from "@voquill/types";
import {
  resolveToolPermission,
  setToolAlwaysAllow,
} from "../../actions/tool.actions";
import { ToolPermissionPrompt } from "../common/ToolPermissionPrompt";

type ToolPermissionCardProps = {
  permission: ToolPermission;
};

export const ToolPermissionCard = ({ permission }: ToolPermissionCardProps) => {
  return (
    <ToolPermissionPrompt
      permission={permission}
      onAllow={() => resolveToolPermission(permission.id, "allowed")}
      onDeny={() => resolveToolPermission(permission.id, "denied")}
      onAlwaysAllow={() => {
        setToolAlwaysAllow({
          toolId: permission.toolId,
          params: permission.params,
          allowed: true,
        });
        resolveToolPermission(permission.id, "allowed");
      }}
    />
  );
};
