import 'package:app/model/tone_model.dart';

const defaultToneId = 'default';
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
    id: defaultToneId,
    name: 'Polished',
    promptTemplate: '''
- Only correct grammar that would confuse the reader or look like an unintentional mistake — do not correct informal phrasing that reflects how the speaker naturally talks
- Keep the speaker's vocabulary, sentence patterns, and tone intact
- The result should read like the speaker sat down and typed it carefully — not like someone else rewrote it
- Remove filler words and speech disfluencies that carry no meaning — words that could be deleted without changing what the speaker is saying or how they're saying it
- Keep words that contribute to the speaker's tone and style
- Convert spoken symbol cues to actual symbols: "hashtag [word]" or "pound sign [word]" becomes "#[word]", and "at [name]" or "at sign [name]" becomes "@[name]".
- Format bulletted lists when the user speaks items in a list format
- The resulting transcription should make sense
- Convert newlines and other intents into actual formatting where applicable (e.g. \\n for line breaks, etc.) and remove the word
- Put backticks around code terms like filenames, function names, and code snippets
- Fix/remove content that was later corrected by the speaker (e.g. fix mistakes, remove retracted statements)''',
    isSystem: true,
    createdAt: 0,
    sortOrder: 0,
  ),
  Tone(
    id: verbatimToneId,
    name: 'Verbatim',
    promptTemplate: '''
- Produce a near-exact transcription that preserves the speaker's voice
- Add punctuation, capitalization, and paragraph breaks for readability
- Remove filler words (um, uh, like, you know), false starts, repeated words, and content the speaker later corrected
- Do NOT fix grammar, do NOT restructure sentences, and do NOT change the speaker's word choices or phrasing
- Convert spoken symbol cues to actual symbols: "hashtag [word]" or "pound sign [word]" becomes "#[word]", and "at [name]" or "at sign [name]" becomes "@[name]"
- Put backticks around code terms like filenames, function names, and code snippets
- Convert newlines and other intents into actual formatting where applicable (e.g. \\n for line breaks, etc.) and remove the word''',
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
- Convert newlines and other intents into actual formatting where applicable (e.g. \\n for line breaks, etc.) and remove the word
- The resulting transcription should make sense
- Put backticks around code terms like filenames, function names, and code snippets
- It should remove and fix content that was later corrected by the speaker
- Format the transcription as a professional email, including a greeting, body, and sign-off; all while preserving the speaker's tone
- DO NOT introduce new phrasing
- DO NOT remove phrasing that would change the speaker's intent except for fixing errors''',
    isSystem: true,
    createdAt: 0,
    sortOrder: 2,
  ),
  Tone(
    id: chatToneId,
    name: 'Chat',
    promptTemplate: '''
- Keep the language casual and conversational like a text message, but make sure to capitalize the first letter of each sentence
- Only correct grammar that would confuse the reader or look like an unintentional mistake — do not correct informal phrasing that reflects how the speaker naturally talks
- Remove filler words that detract from the casual tone of the message
- Remove speech disfluencies (stutters, false starts, repeated words)
- Keep the speaker's vocabulary, sentence patterns, and tone intact
- Keep question marks and exclamation points to preserve the speaker's intent
- Never end the last sentence with a period
- Convert spoken symbol cues to actual symbols: "hashtag [word]" or "pound sign [word]" becomes "#[word]", and "at [name]" or "at sign [name]" becomes "@[name]".
- Format bulletted lists when the user speaks items in a list format
- Convert newlines and other intents into actual formatting where applicable (e.g. \\n for line breaks, etc.) and remove the word
- Put backticks around code terms like filenames, function names, and code snippets
- It should remove content that was later corrected by the speaker''',
    isSystem: true,
    createdAt: 0,
    sortOrder: 3,
  ),
  Tone(
    id: formalToneId,
    name: 'Formal',
    promptTemplate: '''
- Rewrite in a polished, professional register
- Fix grammar, remove filler and disfluencies, and restructure for readability
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
  Tone(
    id: disabledToneId,
    name: 'Disabled',
    promptTemplate: 'Do not apply any post-processing to the transcription.',
    isSystem: true,
    createdAt: 0,
    sortOrder: 5,
    shouldDisablePostProcessing: true,
  ),
];

List<Tone> mergeSystemTones(List<Tone> userTones) {
  final systemTones = getDefaultSystemTones();
  return [...systemTones, ...userTones];
}

List<Tone> sortTones(List<Tone> tones) {
  return List<Tone>.from(tones)..sort((a, b) {
    final aGroup = a.isSystem ? 1 : 0;
    final bGroup = b.isSystem ? 1 : 0;
    if (aGroup != bGroup) return aGroup - bGroup;
    if (a.isSystem && b.isSystem) {
      return (a.sortOrder as int) - (b.sortOrder as int);
    }
    return (b.createdAt as int) - (a.createdAt as int);
  });
}
