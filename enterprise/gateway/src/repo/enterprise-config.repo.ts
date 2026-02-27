import type { EnterpriseConfig } from "@repo/types";
import { getPool } from "../utils/db.utils";

interface EnterpriseConfigRow {
  id: string;
  allow_post_processing: boolean;
  allow_change_post_processing: boolean;
  allow_change_transcription_method: boolean;
  allow_change_agent_mode: boolean;
  allow_email_sign_in: boolean;
  allow_dev_tools: boolean;
  styling_mode: string;
}

function rowToEnterpriseConfig(row: EnterpriseConfigRow): EnterpriseConfig {
  return {
    allowPostProcessing: row.allow_post_processing,
    allowChangePostProcessing: row.allow_change_post_processing,
    allowChangeTranscriptionMethod: row.allow_change_transcription_method,
    allowChangeAgentMode: row.allow_change_agent_mode,
    allowEmailSignIn: row.allow_email_sign_in,
    allowDevTools: row.allow_dev_tools,
    stylingMode: row.styling_mode as EnterpriseConfig["stylingMode"],
  };
}

export async function getEnterpriseConfig(): Promise<EnterpriseConfig> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM enterprise_config WHERE id = 'default'",
  );
  if (result.rows.length === 0) {
    return {
      allowPostProcessing: true,
      allowChangePostProcessing: false,
      allowChangeTranscriptionMethod: false,
      allowChangeAgentMode: false,
      allowEmailSignIn: true,
      allowDevTools: false,
      stylingMode: "manual",
    };
  }
  return rowToEnterpriseConfig(result.rows[0]);
}

export async function upsertEnterpriseConfig(
  config: EnterpriseConfig,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO enterprise_config (id, allow_post_processing, allow_change_post_processing, allow_change_transcription_method, allow_change_agent_mode, allow_email_sign_in, allow_dev_tools, styling_mode)
     VALUES ('default', $1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       allow_post_processing = $1,
       allow_change_post_processing = $2,
       allow_change_transcription_method = $3,
       allow_change_agent_mode = $4,
       allow_email_sign_in = $5,
       allow_dev_tools = $6,
       styling_mode = $7`,
    [config.allowPostProcessing, config.allowChangePostProcessing, config.allowChangeTranscriptionMethod, config.allowChangeAgentMode, config.allowEmailSignIn, config.allowDevTools, config.stylingMode],
  );
}
