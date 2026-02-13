import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import type {
  MetricsPerProvider,
  MetricsPerUser,
  MetricsRange,
} from "@repo/types";
import { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { loadMetrics } from "../../actions/metrics.actions";
import { useIntervalAsync, useOnEnter } from "../../hooks/helper.hooks";
import { getAppState, useAppStore } from "../../store";
import { AppTable, type ColumnDef } from "../common/AppTable";
import { CenteredMessage } from "../common/CenteredMessage";
import { TabLayout } from "../common/TabLayout";

export default function MetricsTab() {
  const intl = useIntl();
  const status = useAppStore((state) => state.metrics.status);
  const summary = useAppStore((state) => state.metrics.summary);
  const daily = useAppStore((state) => state.metrics.daily);
  const perUser = useAppStore((state) => state.metrics.perUser);
  const perProvider = useAppStore((state) => state.metrics.perProvider);
  const range = useAppStore((state) => state.metrics.range);

  useOnEnter(() => {
    loadMetrics(range);
  });

  useIntervalAsync(
    5 * 60 * 1000,
    async () => {
      const state = getAppState();
      if (state.metrics.status === "success") {
        await loadMetrics(state.metrics.range);
      }
    },
    [],
  );

  const handleRangeChange = (_: unknown, value: MetricsRange | null) => {
    if (value) {
      loadMetrics(value);
    }
  };

  const columns: ColumnDef<MetricsPerUser>[] = [
    {
      header: intl.formatMessage({ defaultMessage: "Name" }),
      cell: (row) => row.name || "—",
      getSortKey: (row) => row.name.toLowerCase(),
      weight: 2,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Email" }),
      cell: (row) => row.email,
      getSortKey: (row) => row.email.toLowerCase(),
      weight: 2,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Requests" }),
      cell: (row) => row.requests.toLocaleString(),
      getSortKey: (row) => row.requests,
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Words" }),
      cell: (row) => row.words.toLocaleString(),
      getSortKey: (row) => row.words,
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Avg Latency" }),
      cell: (row) => `${row.avgLatencyMs} ms`,
      getSortKey: (row) => row.avgLatencyMs,
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Last Active" }),
      cell: (row) =>
        row.lastActiveAt
          ? new Date(row.lastActiveAt).toLocaleDateString()
          : "—",
      getSortKey: (row) => row.lastActiveAt ?? "",
      weight: 1,
    },
  ];

  const providerColumns: ColumnDef<MetricsPerProvider>[] = [
    {
      header: intl.formatMessage({ defaultMessage: "Provider" }),
      cell: (row) => row.providerName,
      getSortKey: (row) => row.providerName.toLowerCase(),
      weight: 2,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Requests" }),
      cell: (row) => row.requests.toLocaleString(),
      getSortKey: (row) => row.requests,
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Avg Latency" }),
      cell: (row) => `${row.avgLatencyMs} ms`,
      getSortKey: (row) => row.avgLatencyMs,
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Errors" }),
      cell: (row) => row.errorCount.toLocaleString(),
      getSortKey: (row) => row.errorCount,
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Words" }),
      cell: (row) => row.words.toLocaleString(),
      getSortKey: (row) => row.words,
      weight: 1,
    },
  ];

  const chartData = useMemo(
    () => ({
      dates: daily.map((d) => d.date),
      requests: daily.map((d) => d.requests),
    }),
    [daily],
  );

  if (status === "loading" || status === "idle") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === "error") {
    return (
      <TabLayout title={<FormattedMessage defaultMessage="Usage Metrics" />}>
        <CenteredMessage>
          <Typography color="error">
            <FormattedMessage defaultMessage="Failed to load metrics." />
          </Typography>
          <Button variant="outlined" onClick={() => loadMetrics(range)}>
            <FormattedMessage defaultMessage="Retry" />
          </Button>
        </CenteredMessage>
      </TabLayout>
    );
  }

  return (
    <TabLayout
      title={<FormattedMessage defaultMessage="Usage Metrics" />}
      trailing={
        <ToggleButtonGroup
          size="small"
          value={range}
          exclusive
          onChange={handleRangeChange}
        >
          <ToggleButton value="today">
            <FormattedMessage defaultMessage="Today" />
          </ToggleButton>
          <ToggleButton value="7d">
            <FormattedMessage defaultMessage="7 Days" />
          </ToggleButton>
          <ToggleButton value="30d">
            <FormattedMessage defaultMessage="30 Days" />
          </ToggleButton>
          <ToggleButton value="all">
            <FormattedMessage defaultMessage="All" />
          </ToggleButton>
        </ToggleButtonGroup>
      }
    >
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <SummaryCard
          label={intl.formatMessage({ defaultMessage: "Total Requests" })}
          value={summary?.totalRequests.toLocaleString() ?? "0"}
        />
        <SummaryCard
          label={intl.formatMessage({ defaultMessage: "Total Words" })}
          value={summary?.totalWords.toLocaleString() ?? "0"}
        />
        <SummaryCard
          label={intl.formatMessage({ defaultMessage: "Avg Transcribe" })}
          value={`${summary?.avgTranscribeMs ?? 0} ms`}
        />
        <SummaryCard
          label={intl.formatMessage({ defaultMessage: "Avg Post-Process" })}
          value={`${summary?.avgPostProcessMs ?? 0} ms`}
        />
        <SummaryCard
          label={intl.formatMessage({ defaultMessage: "Error Rate" })}
          value={`${((summary?.errorRate ?? 0) * 100).toFixed(1)}%`}
        />
      </Box>

      {chartData.dates.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            <FormattedMessage defaultMessage="Daily Requests" />
          </Typography>
          <BarChart
            xAxis={[{ scaleType: "band", data: chartData.dates }]}
            series={[{ data: chartData.requests }]}
            height={300}
          />
        </Box>
      )}

      {perProvider.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            <FormattedMessage defaultMessage="Per Provider" />
          </Typography>
          <AppTable
            rows={perProvider}
            columns={providerColumns}
            defaultSortColumnIndex={1}
            defaultSortDirection="desc"
            fixedItemHeight={52}
            sx={{ height: 300 }}
            emptyMessage={intl.formatMessage({
              defaultMessage: "No provider data",
            })}
          />
        </Box>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        <FormattedMessage defaultMessage="Per User" />
      </Typography>
      <AppTable
        rows={perUser}
        columns={columns}
        defaultSortColumnIndex={2}
        defaultSortDirection="desc"
        fixedItemHeight={52}
        sx={{ height: 400 }}
        emptyMessage={intl.formatMessage({
          defaultMessage: "No usage data",
        })}
      />
    </TabLayout>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card sx={{ flex: "1 1 160px", minWidth: 160 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5">{value}</Typography>
      </CardContent>
    </Card>
  );
}
