import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Divider, IconButton, Stack, TextField } from "@mui/material";
import { useMemo, useState, type ChangeEvent } from "react";
import { VirtualizedListPage } from "../common/VirtualizedListPage";

type GlossaryItem = {
  id: string;
  term: string;
  definition: string;
};

const BASE_GLOSSARY_ITEMS: Omit<GlossaryItem, "id">[] = [
  {
    term: "Meeting recap",
    definition: "A condensed",
  },
];

const MOCK_GLOSSARY_ITEMS: GlossaryItem[] = Array.from(
  { length: 1200 },
  (_, index) => {
    const base = BASE_GLOSSARY_ITEMS[index % BASE_GLOSSARY_ITEMS.length];
    const cycle = Math.floor(index / BASE_GLOSSARY_ITEMS.length);
    const suffix = cycle > 0 ? ` (${cycle + 1})` : "";

    return {
      id: String(index + 1),
      term: `${base.term}${suffix}`,
      definition: base.definition,
    };
  }
);

export default function DictionaryPage() {
  const initialItems = useMemo(() => [...MOCK_GLOSSARY_ITEMS], []);
  const [glossaryItems, setGlossaryItems] =
    useState<GlossaryItem[]>(initialItems);

  const handleDeleteItem = (id: string) => {
    setGlossaryItems((current) =>
      current.filter((glossaryItem) => glossaryItem.id !== id)
    );
  };

  const handleItemValueChange =
    (id: string, field: "term" | "definition") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setGlossaryItems((current) =>
        current.map((glossaryItem) =>
          glossaryItem.id === id
            ? {
                ...glossaryItem,
                [field]: value,
              }
            : glossaryItem
        )
      );
    };

  return (
    <VirtualizedListPage
      title="Dictionary"
      subtitle={`Number of items in glossary: ${glossaryItems.length}`}
      items={glossaryItems}
      computeItemKey={(item) => item.id}
      itemContainerSx={{ p: 0}}
      renderItem={(item, index) => (
        <>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Term"
              variant="outlined"
              size="small"
              value={item.term}
              onChange={handleItemValueChange(item.id, "term")}
              sx={{ flex: 1 }}
            />
            <ArrowForwardRoundedIcon color="action" fontSize="small" />
            <TextField
              label="Definition"
              variant="outlined"
              size="small"
              value={item.definition}
              onChange={handleItemValueChange(item.id, "definition")}
              multiline
              minRows={1}
              sx={{ flex: 1 }}
            />
            <IconButton
              aria-label={`Delete dictionary item ${item.term}`}
              onClick={() => handleDeleteItem(item.id)}
              size="small"
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
          {index < glossaryItems.length - 1 ? <Divider sx={{ mt: 2 }} /> : null}
        </>
      )}
    />
  );
}
