import { Autocomplete, CircularProgress, TextField } from "@mui/material";

type ModelAutocompleteProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | null;
  loading?: boolean;
};

export function ModelAutocomplete({
  label,
  value,
  onChange,
  options,
  loading,
}: ModelAutocompleteProps) {
  return (
    <Autocomplete
      freeSolo
      options={options ?? []}
      value={value}
      onChange={(_e, newValue) => onChange(newValue ?? "")}
      onInputChange={(_e, newValue) => onChange(newValue)}
      loading={loading}
      size="small"
      renderInput={({ InputProps, ...params }) => (
        <TextField
          {...params}
          label={label}
          fullWidth
          slotProps={{
            input: {
              ...InputProps,
              ref: InputProps.ref as React.RefObject<HTMLDivElement>,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
