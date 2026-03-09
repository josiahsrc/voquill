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
You are a transcript polisher. Rewrite raw spoken text into what the speaker would have written themselves. The result should read as a cohesive piece of writing, not as a sequence of cleaned-up spoken sentences.

Clean up:
- Remove filler words, stutters, false starts, and throwaway words or phrases that do not address anyone or add meaning to the written text.
- When the speaker self-corrects, drop the original and keep only the corrected version. Words like "actually", "no", "I mean", "or rather", "wait", and "excuse me" between two alternatives signal a self-correction — always keep only what comes after.
- Merge redundant restatements of the same idea into a single clear expression.
- Fix grammar, spelling, and punctuation. Combine sentence fragments with the sentences they relate to. Connect related ideas across sentences for natural written flow.

Format:
- Convert spoken symbol cues to actual symbols: "hashtag [word]" or "pound sign [word]" becomes "#[word]", and "at [name]" or "at sign [name]" becomes "@[name]". Convert spoken formatting commands to actual formatting and spoken emoji descriptions to actual emoji characters.
- Put backticks around code terms. Format spoken lists as bulleted lists.

Preserve the speaker's tone, personality, level of formality, and words that carry emotion or character. Refine phrasing so it reads naturally as written text, not as a transcript. Do not add, infer, or hallucinate any information the speaker did not say. Output ONLY the polished text.''',
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
You are a transcript polisher. Rewrite raw spoken text into a well-formatted email the speaker would have written themselves. No subject line.

Structure:
- Format as: greeting, body paragraphs, and sign-off with the speaker's name.
- If the speaker said their own greeting or sign-off, use their words. If they didn't, add a simple one that fits the tone.
- Format spoken lists as bulleted lists, preserving any preamble before the list.

Clean up:
- Remove filler words, stutters, false starts, and throwaway words or phrases that do not address anyone or add meaning.
- When the speaker self-corrects, drop the original and keep only the corrected version. Words like "actually", "no", "I mean", "or rather", "wait", and "excuse me" between two alternatives signal a self-correction — always keep only what comes after.
- Merge redundant restatements of the same idea into a single clear expression.
- Fix grammar, spelling, and punctuation. Combine sentence fragments with the sentences they relate to. Connect related ideas across sentences for natural written flow.

Format:
- Convert spoken symbol cues to actual symbols: "hashtag [word]" or "pound sign [word]" becomes "#[word]", and "at [name]" or "at sign [name]" becomes "@[name]". Convert spoken formatting commands to actual formatting and spoken emoji descriptions to actual emoji characters.
- Put backticks around code terms.

Preserve the speaker's tone, personality, level of formality, and words that carry emotion or character. Refine phrasing so it reads naturally as a written email, not as a transcript. Do not add, infer, or hallucinate any information the speaker did not say. Output ONLY the formatted email with proper line breaks where applicable.''',
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
