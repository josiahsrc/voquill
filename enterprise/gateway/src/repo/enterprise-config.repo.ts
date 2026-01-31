import type { EnterpriseConfig } from "@repo/types";
import { getPool } from "../utils/db.utils";

interface EnterpriseConfigRow {
  id: string;
  allow_change_post_processing: boolean;
  allow_change_transcription_method: boolean;
}

function rowToEnterpriseConfig(row: EnterpriseConfigRow): EnterpriseConfig {
  return {
    allowChangePostProcessing: row.allow_change_post_processing,
    allowChangeTranscriptionMethod: row.allow_change_transcription_method,
  };
}

export async function getEnterpriseConfig(): Promise<EnterpriseConfig> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM enterprise_config WHERE id = 'default'",
  );
  if (result.rows.length === 0) {
    return {
      allowChangePostProcessing: false,
      allowChangeTranscriptionMethod: false,
    };
  }
  return rowToEnterpriseConfig(result.rows[0]);
}

export async function upsertEnterpriseConfig(
  config: EnterpriseConfig,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO enterprise_config (id, allow_change_post_processing, allow_change_transcription_method)
     VALUES ('default', $1, $2)
     ON CONFLICT (id) DO UPDATE SET
       allow_change_post_processing = $1,
       allow_change_transcription_method = $2`,
    [config.allowChangePostProcessing, config.allowChangeTranscriptionMethod],
  );
}
