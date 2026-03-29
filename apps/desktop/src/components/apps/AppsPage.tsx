import { FormattedMessage } from "react-intl";
import { ScrollListPage } from "../common/ScrollListPage";

export default function AppsPage() {
  return (
    <ScrollListPage
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
