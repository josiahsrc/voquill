import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { IconButton, Stack, TextField } from "@mui/material";
import { useMemo, useState, type ChangeEvent } from "react";
import { VirtualizedListPage } from "../common/VirtualizedListPage";

type GlossaryItem = {
  id: string;
  from: string;
  to: string;
};

const BASE_GLOSSARY_ITEMS: Omit<GlossaryItem, "id">[] = [
  {
    from: "Meeting recap",
    to: "A condensed",
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
      from: `${base.from}${suffix}`,
      to: base.to,
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
      subtitle="Voquill may misunderstand you on occasion. If you see certain words being missed frequently, you can define a replacement rule here to fix the spelling automatically."
      items={glossaryItems}
      computeItemKey={(item) => item.id}
      heightMult={10}
      renderItem={(item) => (
        <>
          <Stack direction="row" spacing={2} alignItems="center" py={1}>
            <TextField
              variant="outlined"
              size="small"
              value={item.from}
              onChange={handleItemValueChange(item.id, "term")}
              sx={{ flex: 1 }}
            />
            <ArrowForwardRoundedIcon color="action" fontSize="small" />
            <TextField
              variant="outlined"
              size="small"
              value={item.to}
              onChange={handleItemValueChange(item.id, "definition")}
              multiline
              minRows={1}
              sx={{ flex: 1 }}
            />
            <IconButton
              aria-label={`Delete dictionary item ${item.from}`}
              onClick={() => handleDeleteItem(item.id)}
              size="small"
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </>
      )}
    />
  );
}
