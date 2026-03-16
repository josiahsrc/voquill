import 'package:app/model/tone_model.dart';
import 'package:app/state/app_state.dart';

const polishedToneId = 'default';
const verbatimToneId = 'verbatim';
const emailToneId = 'email';
const chatToneId = 'chat';
const formalToneId = 'formal';
const disabledToneId = 'disabled';

String formatPromptForPreview(String prompt) {
  return prompt
      .split('\n')
      .join('. ')
      .replaceAll(RegExp(r'[\n\r]+'), ' ')
      .replaceAll(RegExp(r'[-–—]+'), '')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim()
      .replaceAll(RegExp(r'^[.\s]+'), '');
}

List<Tone> getDefaultSystemTones() => const [
  Tone(
    id: polishedToneId,
    name: 'Polished',
    promptTemplate: '''
- GRAMMAR: Only correct grammar that would confuse the reader or look like an unintentional mistake — do not correct informal phrasing that reflects how the speaker naturally 
- WORD CHOICE: Keep the speaker's vocabulary, sentence patterns, and tone intact
- STYLE: The result should read like the speaker sat down and typed it carefully — not like someone else rewrote it.
- STRUCTURE: The refined transcript should be fluid, not choppy, without removing tone or meaning. Single word sentences are choppy and should be combined with surrounding sentences where possible.
- CLEAN UP: Remove filler words and speech disfluencies that carry no meaning — words that could be deleted without changing what the speaker is saying or how they're saying it
- SYMBOLS: Convert spoken symbol cues to actual symbols: "hashtag [word]" or "pound sign [word]" becomes "#[word]", and "at [name]" or "at sign [name]" becomes "@[name]".
- LISTS: Format bulletted lists when the user speaks items in a list format
- SELF CORRECTIONS: When the speaker says something and then corrects themselves, ONLY keep the corrected version and remove the earlier one.
- SENSE: The resulting transcription should make sense
- FORMATTING: Convert newlines and other intents into actual formatting where applicable (e.g. actual new lines for line breaks, etc.) and remove the word
- CODE: Put backticks around code terms like filenames, function names, and code snippets
- CORRECTIONS: Fix/remove content that was later corrected by the speaker (e.g. fix mistakes, remove retracted statements)
- EMOJIS: Convert spoken emoji descriptions into actual emoji characters (e.g. "smiley face" becomes "😊", "thumbs up" becomes "👍", etc.)
- **CRITICAL**: Do NOT use em-dashes in your response
    ''',
    isSystem: true,
    createdAt: 0,
    sortOrder: 0,
  ),
  Tone(
    id: verbatimToneId,
    name: 'Verbatim',
    promptTemplate:
        "Do not apply any post-processing to the transcription. Keep everything exactly as you said it.",
    shouldDisablePostProcessing: true,
    isSystem: true,
    createdAt: 0,
    sortOrder: 1,
  ),
  Tone(
    id: emailToneId,
    name: 'Email',
    promptTemplate: '''
- Sound like the speaker, but written
- Fix grammar, remove filler and disfluencies, and lightly restructure for readability
- Fit the speaker's words into an email format but do NOT add new phrasing, ideas, or words that would otherwise change the intent.
- Preserve the speaker's greeting and sign-off if present
- Remove filler words (um, uh, like, you know, so, basically, actually, I mean) and speech disfluencies (stutters, false starts, repeated words)
- Convert spoken symbol cues to actual symbols: "hashtag [word]" or "pound sign [word]" becomes "#[word]", and "at [name]" or "at sign [name]" becomes "@[name]".
- Format bulletted lists when the user speaks items in a list format
- Convert newlines and other intents into actual formatting where applicable (e.g. actual new lines for line breaks, etc.) and remove the word
- The resulting transcription should make sense
- Put backticks around code terms like filenames, function names, and code snippets
- It should remove and fix content that was later corrected by the speaker
- Format the transcription as a professional email, including a greeting, body, and sign-off; all while preserving the speaker's tone
- DO NOT introduce new phrasing
- DO NOT remove phrasing that would change the speaker's intent except for fixing errors
    ''',
    isSystem: true,
    createdAt: 0,
    sortOrder: 2,
  ),
  Tone(
    id: chatToneId,
    name: 'Chat',
    promptTemplate: '''
- You are formatting spoken words into a chat message. The speaker dictated this out loud — make it sound like them typing.
- Keep it casual and concise. Do not over-structure or over-punctuate.
- Format bulletted lists when the user speaks items in a list format
- Fix spelling and basic punctuation. Do not add exclamation points unless the speaker's tone clearly called for one. Default to periods.
- Preserve the speaker's tone and personality. Do not elevate or formalize, but refine phrasing to read naturally as written text.
- Remove filler words (like, just, um, etc), stutters, and false starts.
- Always remove/fix words that are later self-corrected. Keep only the final intended version of each thought. Self-corrections include patterns like "X, actually, Y", "X, no, Y", "X, I mean Y", "X, or rather, Y", "X... wait, Y", and "X, excuse me, Y" — in all of these, drop X entirely and keep only Y.
- Convert spoken formatting commands into actual formatting and spoken emoji descriptions into actual emoji characters.
- Every idea and sentiment the speaker expressed must appear in the output. If they said something blunt or impolite, keep it.
- Do NOT add greetings, sign-offs, information, or details the speaker did not say''',
    isSystem: true,
    createdAt: 0,
    sortOrder: 3,
  ),
  Tone(
    id: formalToneId,
    name: 'Formal',
    promptTemplate: '''
- Rewrite in a polished, professional register
- Remove filler words (like, just, um, etc), stutters, and false starts.
- Always remove/fix words that are later self-corrected. Keep only the final intended version of each thought. Self-corrections include patterns like "X, actually, Y", "X, no, Y", "X, I mean Y", "X, or rather, Y", "X... wait, Y", and "X, excuse me, Y" — in all of these, drop X entirely and keep only Y.
- Keep the speaker's vocabulary, sentence patterns, while enforcing a formal tone
- Use complete sentences, precise vocabulary, and proper grammar
- Avoid contractions, colloquialisms, and casual phrasing
- It should remove content that was later corrected by the speaker
- The result should be suitable for official documents, proposals, or professional correspondence
- It is expected that the speaker's casual voice will be replaced with a formal tone that is confident
- Preserve all meaningful content and intent from the original transcript''',
    isSystem: true,
    createdAt: 0,
    sortOrder: 4,
  ),
];

List<Tone> mergeSystemTones(List<Tone> userTones) {
  final systemTones = getDefaultSystemTones();
  return [...systemTones, ...userTones];
}

List<String> getActiveManualToneIds(AppState state) {
  final toneIds = state.user?.activeToneIds ?? [];
  final validToneIds = toneIds
      .where((id) => state.toneById.containsKey(id))
      .toList();
  return validToneIds.isNotEmpty ? validToneIds : [polishedToneId];
}

String getManuallySelectedToneId(AppState state) {
  final toneId = state.user?.selectedToneId;
  final tone = toneId != null ? state.toneById[toneId] : null;

  final activeIds = getActiveManualToneIds(state);
  if (tone != null && activeIds.contains(tone.id)) {
    return tone.id;
  }

  return activeIds.firstOrNull ?? polishedToneId;
}

List<String> getSortedToneIds(AppState state) {
  final usedToneIds = <String>{
    if (state.user?.selectedToneId != null) state.user!.selectedToneId!,
    ...getActiveManualToneIds(state),
  };

  final tones =
      state.toneById.values
          .where((t) => t.isDeprecated != true || usedToneIds.contains(t.id))
          .toList()
        ..sort(_compareTones);

  return tones.map((t) => t.id).toList();
}

List<String> getActiveSortedToneIds(AppState state) {
  final activeSet = getActiveManualToneIds(state).toSet();
  return getSortedToneIds(state).where((id) => activeSet.contains(id)).toList();
}

int _compareTones(Tone a, Tone b) {
  final groupCmp = _toneGroupOrder(a) - _toneGroupOrder(b);
  if (groupCmp != 0) return groupCmp;
  return (b.createdAt - a.createdAt).toInt();
}

int _toneGroupOrder(Tone tone) {
  if (tone.isSystem) return 2;
  if (tone.isGlobal == true) return 1;
  return 0;
}
