import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Button } from "@mui/material";
import { useCallback, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { addMcpServer, loadMcpServers } from "../../actions/mcp-server.actions";
import { useAppStore } from "../../store";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { McpServerRow } from "./McpServerRow";

export default function AppsPage() {
  const mcpServerIds = useAppStore((state) => state.apps.mcpServerIds);

  useEffect(() => {
    loadMcpServers();
  }, []);

  const handleAddMicrosoftGraph = useCallback(() => {
    addMcpServer("microsoft_graph");
  }, []);

  const addButton = (
    <Button
      variant="text"
      startIcon={<AddRoundedIcon />}
      onClick={handleAddMicrosoftGraph}
    >
      <FormattedMessage defaultMessage="Connect Microsoft" />
    </Button>
  );

  return (
    <VirtualizedListPage
      title={<FormattedMessage defaultMessage="Apps" />}
      subtitle={
        <FormattedMessage defaultMessage="Connect external services to enhance Voquill's agent capabilities." />
      }
      action={addButton}
      items={mcpServerIds}
      computeItemKey={(id) => id}
      heightMult={8}
      renderItem={(id) => <McpServerRow key={id} id={id} />}
    />
  );
}
