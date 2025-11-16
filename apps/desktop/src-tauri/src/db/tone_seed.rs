use sqlx::SqlitePool;

use crate::domain::Tone;

fn build_system_tone_prompt(additional_instructions: &str) -> String {
    let mut prompt = String::from(
        "You are Voquill, a transcription rewrite agent. Make the language vocal, clean, and free of filler while preserving the speaker's meaning. Remove filler words, false starts, repetitions, and disfluencies. Fix grammar and structure without embellishing, and preserve the speaker's tone exactly. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.",
    );

    let trimmed = additional_instructions.trim();
    if !trimmed.is_empty() {
        prompt.push(' ');
        prompt.push_str(trimmed);
    }

    prompt.push_str(
        "\n\nHere is the transcript:\n-------\n{transcript}\n-------\n\nReturn only the cleaned version.",
    );

    prompt
}

/// Default tone definitions with their prompts
pub async fn seed_default_tones_if_needed(pool: SqlitePool) -> Result<(), sqlx::Error> {
    // Check if any tones exist
    let count = crate::db::tone_queries::count_tones(pool.clone()).await?;

    if count > 0 {
        eprintln!(
            "[tones] Default tones already present ({} entries); skipping seed.",
            count
        );
        return Ok(());
    }

    eprintln!("[tones] Seeding default tones...");

    let default_tones = vec![
        Tone::new_system(
            "light".to_string(),
            "Light".to_string(),
            build_system_tone_prompt(
                "Make only surgical corrections that fix spelling, punctuation, or clear grammatical mistakes while keeping the speaker's sentences exactly as spoken.",
            ),
            0,
        ),
        Tone::new_system(
            "casual".to_string(),
            "Casual".to_string(),
            build_system_tone_prompt(
                "The cleaned output should feel casual, vocal, and approachable—like a friendly conversation—while preserving the speaker's core message.",
            ),
            1,
        ),
        Tone::new_system(
            "formal".to_string(),
            "Formal".to_string(),
            build_system_tone_prompt(
                "Deliver the result in a polished, formal register with precise grammar and professional language while keeping every idea from the speaker.",
            ),
            2,
        ),
        Tone::new_system(
            "business".to_string(),
            "Business".to_string(),
            build_system_tone_prompt(
                "Return a concise, business-ready version that is direct, action-oriented, and focused on the key decisions or takeaways without losing meaning.",
            ),
            3,
        ),
        Tone::new_system(
            "punny".to_string(),
            "Punny".to_string(),
            build_system_tone_prompt(
                "Inject clever puns and playful wordplay while keeping the original intent fully intact, and maintain the same level of polish as a clean transcript.",
            ),
            4,
        ),
    ];

    for tone in default_tones {
        crate::db::tone_queries::insert_tone(pool.clone(), &tone).await?;
    }

    eprintln!("[tones] Successfully seeded {} default tones", 5);

    Ok(())
}
