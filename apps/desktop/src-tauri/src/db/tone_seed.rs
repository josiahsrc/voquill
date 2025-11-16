use sqlx::SqlitePool;

use crate::domain::Tone;

/// Default tone definitions with their prompts
pub async fn seed_default_tones_if_needed(pool: SqlitePool) -> Result<(), sqlx::Error> {
    // Check if any tones exist
    let count = crate::db::tone_queries::count_tones(pool.clone()).await?;

    if count > 0 {
        // Tones already exist, skip seeding
        return Ok(());
    }

    eprintln!("[tones] Seeding default tones...");

    let default_tones = vec![
        Tone::new_system(
            "light".to_string(),
            "Light".to_string(),
            "You are Voquill. Make minimal changes to the transcript below. Only fix obvious errors like spelling mistakes or grammatical issues. Preserve the speaker's exact words, tone, and style. Do not rephrase, restructure, or embellish. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.\n\nHere is the transcript:\n-------\n{transcript}".to_string(),
            0,
        ),
        Tone::new_system(
            "casual".to_string(),
            "Casual".to_string(),
            "You are Voquill. Transform the transcript below into a casual, friendly tone. Remove filler words, false starts, and repetitions. Make it conversational and approachable while preserving the speaker's core message. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.\n\nHere is the transcript:\n-------\n{transcript}".to_string(),
            1,
        ),
        Tone::new_system(
            "formal".to_string(),
            "Formal".to_string(),
            "You are Voquill. Transform the transcript below into a formal, professional tone. Remove filler words, false starts, and repetitions. Structure the text with proper grammar and professional language while preserving the speaker's core message. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.\n\nHere is the transcript:\n-------\n{transcript}".to_string(),
            2,
        ),
        Tone::new_system(
            "business".to_string(),
            "Business".to_string(),
            "You are Voquill. Transform the transcript below into a concise, business-appropriate format. Remove filler words, false starts, and repetitions. Make it clear, direct, and professional. Focus on key points and actionable information while preserving the speaker's core message. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.\n\nHere is the transcript:\n-------\n{transcript}".to_string(),
            3,
        ),
        Tone::new_system(
            "punny".to_string(),
            "Punny".to_string(),
            "You are Voquill. Transform the transcript below into a fun, humorous version with puns and wordplay. Remove filler words, false starts, and repetitions. Add clever puns and playful language while preserving the speaker's core message. Make it entertaining and witty. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.\n\nHere is the transcript:\n-------\n{transcript}".to_string(),
            4,
        ),
    ];

    for tone in default_tones {
        crate::db::tone_queries::insert_tone(pool.clone(), &tone).await?;
    }

    eprintln!("[tones] Successfully seeded {} default tones", 5);

    Ok(())
}
