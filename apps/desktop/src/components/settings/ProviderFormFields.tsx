import { Box, Switch, TextField, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import type { ProviderFormConfig } from "./api-key-provider-config";

type ProviderFormFieldsProps = {
  config: ProviderFormConfig;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled: boolean;
  includeV1Path?: boolean;
  onIncludeV1PathChange?: (value: boolean) => void;
  isEditing?: boolean;
};

export const ProviderFormFields = ({
  config,
  values,
  onChange,
  disabled,
  includeV1Path,
  onIncludeV1PathChange,
  isEditing,
}: ProviderFormFieldsProps) => {
  return (
    <>
      {config.fields.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          value={values[field.key] ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={
            isEditing && field.type === "password"
              ? "Leave blank to keep current key"
              : field.placeholder
          }
          size="small"
          fullWidth
          type={field.type ?? "text"}
          disabled={disabled}
          helperText={
            isEditing && field.type === "password" ? (
              <FormattedMessage defaultMessage="Leave blank to keep current key" />
            ) : (
              field.helperText
            )
          }
        />
      ))}
      {config.showIncludeV1Path && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2">
            <FormattedMessage defaultMessage="Include /v1 path" />
          </Typography>
          <Switch
            checked={includeV1Path ?? true}
            onChange={(e) => onIncludeV1PathChange?.(e.target.checked)}
            disabled={disabled}
            size="small"
          />
        </Box>
      )}
    </>
  );
};
