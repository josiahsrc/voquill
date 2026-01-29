import { Add, Delete, Edit } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type { Term } from "@repo/types";
import { useEffect, useState } from "react";
import {
  deleteGlobalTerm,
  loadGlobalTerms,
  upsertGlobalTerm,
} from "../../actions/terms.actions";
import { useAppStore } from "../../store";

type TermFormState = {
  id: string;
  sourceValue: string;
  destinationValue: string;
  isReplacement: boolean;
};

const EMPTY_FORM: TermFormState = {
  id: "",
  sourceValue: "",
  destinationValue: "",
  isReplacement: false,
};

export default function TermsTab() {
  const termIds = useAppStore((state) => state.terms.termIds);
  const termById = useAppStore((state) => state.termById);
  const status = useAppStore((state) => state.terms.status);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TermFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGlobalTerms();
  }, []);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, id: crypto.randomUUID() });
    setDialogOpen(true);
  };

  const openEdit = (term: Term) => {
    setForm({
      id: term.id,
      sourceValue: term.sourceValue,
      destinationValue: term.destinationValue,
      isReplacement: term.isReplacement,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = termById[form.id];
      await upsertGlobalTerm({
        id: form.id,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        sourceValue: form.sourceValue,
        destinationValue: form.destinationValue,
        isReplacement: form.isReplacement,
        isGlobal: true,
      });
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (termId: string) => {
    await deleteGlobalTerm(termId);
  };

  if (status === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Global Terms</Typography>
        <Button
          startIcon={<Add />}
          variant="contained"
          size="small"
          onClick={openCreate}
        >
          Add Term
        </Button>
      </Box>

      {termIds.length === 0 ? (
        <Typography color="text.secondary">No global terms yet.</Typography>
      ) : (
        <List>
          {termIds.map((id) => {
            const term = termById[id];
            if (!term) return null;
            return (
              <ListItem
                key={id}
                secondaryAction={
                  <Box>
                    <IconButton onClick={() => openEdit(term)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={term.sourceValue}
                  secondary={
                    term.isReplacement
                      ? `→ ${term.destinationValue}`
                      : "Glossary term"
                  }
                />
              </ListItem>
            );
          })}
        </List>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {termById[form.id] ? "Edit Term" : "Add Term"}
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "16px !important",
          }}
        >
          <TextField
            label="Source Value"
            fullWidth
            size="small"
            value={form.sourceValue}
            onChange={(e) =>
              setForm((f) => ({ ...f, sourceValue: e.target.value }))
            }
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.isReplacement}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isReplacement: e.target.checked }))
                }
              />
            }
            label="Replacement rule"
          />
          {form.isReplacement && (
            <TextField
              label="Destination Value"
              fullWidth
              size="small"
              value={form.destinationValue}
              onChange={(e) =>
                setForm((f) => ({ ...f, destinationValue: e.target.value }))
              }
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.sourceValue}
          >
            {saving ? <CircularProgress size={20} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
