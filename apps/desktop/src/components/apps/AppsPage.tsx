import { FormattedMessage } from "react-intl";
import { VirtualizedListPage } from "../common/VirtualizedListPage";

export default function AppsPage() {
  return (
    <VirtualizedListPage
      title={<FormattedMessage defaultMessage="Apps" />}
      subtitle={
        <FormattedMessage defaultMessage="Configure MCP servers and integrations." />
      }
      items={[]}
      computeItemKey={(id) => id}
      renderItem={() => null}
    />
  );
}
