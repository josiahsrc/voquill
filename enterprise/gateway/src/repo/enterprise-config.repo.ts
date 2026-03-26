import type { EnterpriseConfig } from "@voquill/types";
import { getPool } from "../utils/db.utils";

interface EnterpriseConfigRow {
  id: string;
  allow_post_processing: boolean;
  allow_change_post_processing: boolean;
  allow_change_transcription_method: boolean;
  assistant_mode_enabled: boolean;
  power_mode_enabled: boolean;
  allow_multi_device_mode: boolean;
  allow_email_sign_in: boolean;
  allow_dev_tools: boolean;
  styling_mode: string;
}

function rowToEnterpriseConfig(row: EnterpriseConfigRow): EnterpriseConfig {
  return {
    allowPostProcessing: row.allow_post_processing,
    allowChangePostProcessing: row.allow_change_post_processing,
    allowChangeTranscriptionMethod: row.allow_change_transcription_method,
    assistantModeEnabled: row.assistant_mode_enabled,
    powerModeEnabled: row.power_mode_enabled,
    allowMultiDeviceMode: row.allow_multi_device_mode,
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
      assistantModeEnabled: false,
      powerModeEnabled: false,
      allowMultiDeviceMode: false,
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
    `INSERT INTO enterprise_config (id, allow_post_processing, allow_change_post_processing, allow_change_transcription_method, assistant_mode_enabled, power_mode_enabled, allow_multi_device_mode, allow_email_sign_in, allow_dev_tools, styling_mode)
     VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET
       allow_post_processing = $1,
       allow_change_post_processing = $2,
       allow_change_transcription_method = $3,
       assistant_mode_enabled = $4,
       power_mode_enabled = $5,
       allow_multi_device_mode = $6,
       allow_email_sign_in = $7,
       allow_dev_tools = $8,
       styling_mode = $9`,
    [config.allowPostProcessing, config.allowChangePostProcessing, config.allowChangeTranscriptionMethod, config.assistantModeEnabled, config.powerModeEnabled, config.allowMultiDeviceMode, config.allowEmailSignIn, config.allowDevTools, config.stylingMode],
  );
}
