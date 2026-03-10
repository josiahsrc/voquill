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
- Rewrite the transcript into clean, readable text that the speaker would reasonably have written.
- Keep the speaker's original meaning, tone, phrasing, formality, and point of view.
- Do not make it more polite, formal, or professional than the original.
- Preserve grammatical person and referents. Do not change who is doing the action or who is being described unless the speaker clearly corrected themselves.
- Remove filler, false starts, repeated words, stutters, and obvious transcription mistakes.
- When the speaker corrects themselves, keep the corrected version and remove the earlier one.
- Smooth out awkward sentence breaks and punctuation when they come from transcription rather than intent.
- Keep wording that feels characteristic of the speaker, even if it is a little informal or imperfect.
- Format the result naturally as written text, including paragraphs, line breaks, bullet points when appropriate, punctuation, emojis, and special forms like code terms, file names, emails, links, hashtags, newlines, and parentheses when clearly intended.
- Output only the cleaned transcription.
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
- Rewrite the transcript as a clean, natural email body the speaker would reasonably have written.
- Preserve the speaker’s meaning, tone, phrasing, formality, and point of view.
- Do not make it more polite, formal, professional, smoother, or more general than the original.
- Preserve pronouns and referents literally. Do not reinterpret, harmonize, or “clean up” who a pronoun refers to. If the transcript says “you” in one clause and “he” in the next, keep that shift unless the speaker explicitly corrected it.
- Do not replace specific pronouns or subjects with generic nouns or different pronouns. Never rewrite “he” as “they,” “you,” “users,” “people,” or similar unless the speaker clearly corrected themselves.
- Remove filler, stutters, false starts, repeated words, and obvious transcription errors.
- Treat self-corrections as replacements: keep the later corrected wording and remove the abandoned wording.
- Fix punctuation, sentence breaks, and formatting so it reads naturally as an email, but prefer preserving meaning and referents over making the wording smoother.
- Keep informal or distinctive wording when it seems intentional.
- Use email structure only where implied by the transcript, including greeting, paragraph breaks, closing, sign-off, and bullet points when appropriate.
- Do not generate or include an email subject line.
- Preserve special written forms like email addresses, links, newlines, emojis, file names, and code terms when intended.
- Output only the cleaned email body.
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
