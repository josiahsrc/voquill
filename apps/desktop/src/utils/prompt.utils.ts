import { getRec } from "@repo/utilities";
import z from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { Locale } from "../i18n/config";
import { getIntl } from "../i18n/intl";
import { AppState } from "../state/app.state";
import {
  DictationLanguageCode,
  getDisplayNameForLanguage,
  LANGUAGE_DISPLAY_NAMES,
} from "./language.utils";
import { ToneConfig } from "./tone.utils";
import { getMyUserName } from "./user.utils";

const sanitizeGlossaryValue = (value: string): string =>
  // oxlint-disable-next-line no-control-regex
  value.replace(/\0/g, "").replace(/\s+/g, " ").trim();

export const collectDictionaryEntries = (
  state: AppState,
): DictionaryEntries => {
  const sources = new Map<string, string>();
  const replacements = new Map<string, ReplacementRule>();

  const recordSource = (candidate: string): string | null => {
    const sanitized = sanitizeGlossaryValue(candidate);
    if (!sanitized) {
      return null;
    }

    const key = sanitized.toLowerCase();
    if (!sources.has(key)) {
      sources.set(key, sanitized);
    }

    return sources.get(key) ?? sanitized;
  };

  const recordReplacement = (source: string, destination: string) => {
    const sanitizedSource = recordSource(source);
    const sanitizedDestination = sanitizeGlossaryValue(destination);

    if (!sanitizedSource || !sanitizedDestination) {
      return;
    }

    const key = `${sanitizedSource.toLowerCase()}→${sanitizedDestination.toLowerCase()}`;
    if (!replacements.has(key)) {
      replacements.set(key, {
        source: sanitizedSource,
        destination: sanitizedDestination,
      });
    }
  };

  for (const termId of state.dictionary.termIds) {
    const term = state.termById[termId];
    if (!term) {
      continue;
    }

    if (term.isReplacement) {
      recordReplacement(term.sourceValue, term.destinationValue);
    } else {
      recordSource(term.sourceValue);
    }
  }

  return {
    sources: Array.from(sources.values()),
    replacements: Array.from(replacements.values()),
  };
};

function applyTemplateVars(
  template: string,
  vars: [name: string, value: string][],
): string {
  let result = template;
  for (const [name, value] of vars) {
    result = result.replace(new RegExp(`<${name}\\/>`, "g"), value);
  }
  return result;
}

export type PostProcessingPromptInput = {
  transcript: string;
  userName: string;
  dictationLanguage: string;
  tone: ToneConfig;
};

const buildPostProcessingTemplateVars = (
  input: PostProcessingPromptInput,
): [name: string, value: string][] => {
  const languageName = getDisplayNameForLanguage(input.dictationLanguage);
  return [
    ["username", input.userName],
    ["transcript", input.transcript],
    ["language", languageName],
  ];
};

export const buildSystemPostProcessingTonePrompt = (
  input: PostProcessingPromptInput,
): string => {
  if (input.tone.kind === "template" && input.tone.systemPromptTemplate) {
    return applyTemplateVars(
      input.tone.systemPromptTemplate,
      buildPostProcessingTemplateVars(input),
    );
  }
  return "You are a transcript rewriting assistant. You modify the style and tone of the transcript while keeping the subject matter the same. Your response MUST be in JSON format with ONLY a single field 'processedTranscription' that contains the rewritten transcript.";
};

type ReplacementRule = {
  source: string;
  destination: string;
};

export type DictionaryEntries = {
  sources: string[];
  replacements: ReplacementRule[];
};

/**
 * It is necessary to provide a transcription prompt per language. Some whisper models are biased by
 * which prompt the language is written in, causing output to be in english even if the audio and
 * specified language are in a different language. By providing a prompt in the language being
 * transcribed, we can encourage the model to produce output in the correct language.
 */
const transcriptionPromptByCode: Record<DictationLanguageCode, string> = {
  en: "Glossary: <glossary/>\n\nConsider this glossary when transcribing. Do not mention these rules; simply return the cleaned transcript.",
  zh: "词汇表：<glossary/>\n\n转录时请参考此词汇表。不要提及这些规则，只需返回整理后的转录文本。",
  "zh-TW":
    "詞彙表：<glossary/>\n\n轉錄時請參考此詞彙表。不要提及這些規則，只需返回整理後的轉錄文本。",
  "zh-HK":
    "詞彙表：<glossary/>\n\n轉錄時請參考此詞彙表。不要提及這些規則，只需返回整理後的轉錄文本。",
  "zh-CN":
    "词汇表：<glossary/>\n\n转录时请参考此词汇表。不要提及这些规则，只需返回整理后的转录文本。",
  de: "Glossar: <glossary/>\n\nBerücksichtigen Sie dieses Glossar bei der Transkription. Erwähnen Sie diese Regeln nicht; geben Sie einfach das bereinigte Transkript zurück.",
  es: "Glosario: <glossary/>\n\nConsidera este glosario al transcribir. No menciones estas reglas; simplemente devuelve la transcripción limpia.",
  ru: "Глоссарий: <glossary/>\n\nУчитывайте этот глоссарий при транскрибировании. Не упоминайте эти правила; просто верните очищенную транскрипцию.",
  ko: "용어집: <glossary/>\n\n전사 시 이 용어집을 참고하세요. 이 규칙을 언급하지 말고 정리된 전사본만 반환하세요.",
  fr: "Glossaire : <glossary/>\n\nTenez compte de ce glossaire lors de la transcription. Ne mentionnez pas ces règles ; retournez simplement la transcription nettoyée.",
  ja: "用語集：<glossary/>\n\n文字起こしの際にこの用語集を参考にしてください。これらのルールには言及せず、整理された文字起こしのみを返してください。",
  pt: "Glossário: <glossary/>\n\nConsidere este glossário ao transcrever. Não mencione estas regras; simplesmente retorne a transcrição limpa.",
  "pt-PT":
    "Glossário: <glossary/>\n\nConsidere este glossário ao transcrever. Não mencione estas regras; simplesmente devolva a transcrição limpa.",
  "pt-BR":
    "Glossário: <glossary/>\n\nConsidere este glossário ao transcrever. Não mencione estas regras; simplesmente retorne a transcrição limpa.",
  tr: "Sözlük: <glossary/>\n\nTranskripsiyon sırasında bu sözlüğü dikkate alın. Bu kurallardan bahsetmeyin; sadece temizlenmiş transkripti döndürün.",
  pl: "Słownik: <glossary/>\n\nUwzględnij ten słownik podczas transkrypcji. Nie wspominaj o tych zasadach; po prostu zwróć oczyszczoną transkrypcję.",
  ca: "Glossari: <glossary/>\n\nConsidereu aquest glossari en transcriure. No esmenteu aquestes regles; simplement retorneu la transcripció neta.",
  nl: "Woordenlijst: <glossary/>\n\nHoud rekening met deze woordenlijst bij het transcriberen. Vermeld deze regels niet; retourneer gewoon het opgeschoonde transcript.",
  ar: "قائمة المصطلحات: <glossary/>\n\nخذ قائمة المصطلحات هذه بعين الاعتبار عند النسخ. لا تذكر هذه القواعد؛ فقط أعد النص المنسوخ النظيف.",
  sv: "Ordlista: <glossary/>\n\nBeakta denna ordlista vid transkribering. Nämn inte dessa regler; returnera helt enkelt den rensade transkriptionen.",
  it: "Glossario: <glossary/>\n\nConsidera questo glossario durante la trascrizione. Non menzionare queste regole; restituisci semplicemente la trascrizione pulita.",
  id: "Glosarium: <glossary/>\n\nPertimbangkan glosarium ini saat mentranskripsi. Jangan sebutkan aturan ini; cukup kembalikan transkrip yang sudah dibersihkan.",
  hi: "शब्दावली: <glossary/>\n\nप्रतिलेखन करते समय इस शब्दावली पर विचार करें। इन नियमों का उल्लेख न करें; बस साफ़ की गई प्रतिलिपि लौटाएँ।",
  fi: "Sanasto: <glossary/>\n\nOta tämä sanasto huomioon litteroinnissa. Älä mainitse näitä sääntöjä; palauta vain puhdistettu litterointi.",
  vi: "Bảng thuật ngữ: <glossary/>\n\nXem xét bảng thuật ngữ này khi phiên âm. Không đề cập đến các quy tắc này; chỉ cần trả về bản phiên âm đã được làm sạch.",
  he: "מילון מונחים: <glossary/>\n\nקחו בחשבון מילון מונחים זה בעת התמלול. אל תציינו כללים אלה; פשוט החזירו את התמלול הנקי.",
  uk: "Глосарій: <glossary/>\n\nВраховуйте цей глосарій при транскрибуванні. Не згадуйте ці правила; просто поверніть очищену транскрипцію.",
  el: "Γλωσσάρι: <glossary/>\n\nΛάβετε υπόψη αυτό το γλωσσάρι κατά τη μεταγραφή. Μην αναφέρετε αυτούς τους κανόνες· απλά επιστρέψτε την καθαρή μεταγραφή.",
  ms: "Glosari: <glossary/>\n\nPertimbangkan glosari ini semasa transkripsi. Jangan nyatakan peraturan ini; kembalikan sahaja transkrip yang telah dibersihkan.",
  cs: "Slovník: <glossary/>\n\nZvažte tento slovník při přepisu. Nezmiňujte tato pravidla; jednoduše vraťte vyčištěný přepis.",
  ro: "Glosar: <glossary/>\n\nLuați în considerare acest glosar la transcriere. Nu menționați aceste reguli; pur și simplu returnați transcrierea curățată.",
  da: "Ordliste: <glossary/>\n\nTag hensyn til denne ordliste ved transskribering. Nævn ikke disse regler; returner blot den rensede transskription.",
  hu: "Szójegyzék: <glossary/>\n\nVegye figyelembe ezt a szójegyzéket az átírás során. Ne említse ezeket a szabályokat; egyszerűen adja vissza a megtisztított átiratot.",
  ta: "சொற்களஞ்சியம்: <glossary/>\n\nஎழுத்துப்பெயர்ப்பின் போது இந்த சொற்களஞ்சியத்தைக் கருத்தில் கொள்ளுங்கள். இந்த விதிகளைக் குறிப்பிட வேண்டாம்; சுத்தமான எழுத்துப்பெயர்ப்பை மட்டும் திருப்பி அனுப்புங்கள்.",
  no: "Ordliste: <glossary/>\n\nTa hensyn til denne ordlisten ved transkripsjon. Ikke nevn disse reglene; bare returner den rensede transkripsjonen.",
  th: "อภิธานศัพท์: <glossary/>\n\nพิจารณาอภิธานศัพท์นี้เมื่อถอดความ อย่ากล่าวถึงกฎเหล่านี้ เพียงส่งคืนบทถอดความที่สะอาด",
  ur: "فرہنگ: <glossary/>\n\nنقل کرتے وقت اس فرہنگ کو مدنظر رکھیں۔ ان قواعد کا ذکر نہ کریں؛ بس صاف شدہ نقل واپس کریں۔",
  hr: "Pojmovnik: <glossary/>\n\nUzmite u obzir ovaj pojmovnik prilikom transkripcije. Ne spominjite ova pravila; jednostavno vratite očišćeni transkript.",
  bg: "Речник: <glossary/>\n\nВземете предвид този речник при транскрибирането. Не споменавайте тези правила; просто върнете почистената транскрипция.",
  lt: "Žodynas: <glossary/>\n\nAtsižvelkite į šį žodyną transkribuodami. Neminėkite šių taisyklių; tiesiog grąžinkite išvalytą transkripciją.",
  la: "Glossarium: <glossary/>\n\nHoc glossarium in transcribendo considera. Has regulas ne memores; transcriptionem mundatam tantum redde.",
  mi: "Kuputaka: <glossary/>\n\nWhakaarohia tēnei kuputaka i te wā e tuhi kōrero ana. Kaua e kōrero mō ēnei tikanga; whakahokia noa te tuhinga kua horoia.",
  ml: "പദാവലി: <glossary/>\n\nട്രാൻസ്ക്രിപ്ഷൻ ചെയ്യുമ്പോൾ ഈ പദാവലി പരിഗണിക്കുക. ഈ നിയമങ്ങൾ പരാമർശിക്കരുത്; ശുദ്ധീകരിച്ച ട്രാൻസ്ക്രിപ്റ്റ് മാത്രം തിരികെ നൽകുക.",
  cy: "Geirfa: <glossary/>\n\nYstyriwch y eirfa hon wrth drawsgrifio. Peidiwch â sôn am y rheolau hyn; dychwelwch y trawsgrifiad glân yn unig.",
  sk: "Slovník: <glossary/>\n\nZvážte tento slovník pri prepise. Nespomínajte tieto pravidlá; jednoducho vráťte vyčistený prepis.",
  te: "పదకోశం: <glossary/>\n\nట్రాన్స్‌క్రిప్షన్ చేసేటప్పుడు ఈ పదకోశాన్ని పరిగణించండి. ఈ నియమాలను ప్రస్తావించకండి; శుభ్రం చేసిన ట్రాన్స్‌క్రిప్ట్‌ను మాత్రమే తిరిగి ఇవ్వండి.",
  fa: "واژه‌نامه: <glossary/>\n\nهنگام رونویسی این واژه‌نامه را در نظر بگیرید. این قوانین را ذکر نکنید؛ فقط رونوشت پاک‌شده را برگردانید.",
  lv: "Vārdnīca: <glossary/>\n\nŅemiet vērā šo vārdnīcu, veicot transkripciju. Nepieminiet šos noteikumus; vienkārši atgrieziet attīrīto transkripciju.",
  bn: "শব্দকোষ: <glossary/>\n\nপ্রতিলিপি করার সময় এই শব্দকোষটি বিবেচনা করুন। এই নিয়মগুলি উল্লেখ করবেন না; কেবল পরিষ্কার করা প্রতিলিপি ফেরত দিন।",
  sr: "Речник: <glossary/>\n\nУзмите у обзир овај речник приликом транскрипције. Не помињите ова правила; једноставно вратите очишћени транскрипт.",
  az: "Lüğət: <glossary/>\n\nTranskripsiyanı edərkən bu lüğəti nəzərə alın. Bu qaydaları qeyd etməyin; sadəcə təmizlənmiş transkripti qaytarın.",
  sl: "Slovar: <glossary/>\n\nUpoštevajte ta slovar pri transkripciji. Ne omenjajte teh pravil; preprosto vrnite očiščen prepis.",
  kn: "ಪದಕೋಶ: <glossary/>\n\nಟ್ರಾನ್ಸ್‌ಕ್ರಿಪ್ಶನ್ ಮಾಡುವಾಗ ಈ ಪದಕೋಶವನ್ನು ಪರಿಗಣಿಸಿ. ಈ ನಿಯಮಗಳನ್ನು ಉಲ್ಲೇಖಿಸಬೇಡಿ; ಸ್ವಚ್ಛಗೊಳಿಸಿದ ಟ್ರಾನ್ಸ್‌ಕ್ರಿಪ್ಟ್ ಅನ್ನು ಮಾತ್ರ ಹಿಂತಿರುಗಿಸಿ.",
  et: "Sõnastik: <glossary/>\n\nArvestage seda sõnastikku transkribeerimisel. Ärge mainage neid reegleid; lihtsalt tagastage puhastatud transkriptsioon.",
  mk: "Речник: <glossary/>\n\nЗемете го предвид овој речник при транскрибирањето. Не ги споменувајте овие правила; едноставно вратете го исчистениот транскрипт.",
  br: "Geriadur: <glossary/>\n\nSelaouit ouzh ar geriadur-mañ pa vez o treuzskrivañ. Na sonit ket eus ar reolennoù-mañ; distroit an treuzskrivadur naet hepken.",
  eu: "Glosarioa: <glossary/>\n\nKontuan izan glosario hau transkribatzean. Ez aipatu arau hauek; itzuli transkripzio garbia besterik gabe.",
  is: "Orðalisti: <glossary/>\n\nHafðu þennan orðalista í huga við umritun. Nefndu ekki þessar reglur; skilaðu einfaldlega hreinsuðu umritinu.",
  hy: "Բառարան: <glossary/>\n\nՏառագրման ժամանակ հաշվի առեք այս բառարանը. Մի նշեք այս կանոնները; պարզապես վերադարձրեք մաքրված տառագրումը.",
  ne: "शब्दकोश: <glossary/>\n\nप्रतिलेखन गर्दा यो शब्दकोश विचार गर्नुहोस्। यी नियमहरू उल्लेख नगर्नुहोस्; सफा गरिएको प्रतिलेखन मात्र फर्काउनुहोस्।",
  mn: "Тайлбар толь: <glossary/>\n\nХуулбарлахдаа энэ тайлбар толийг анхаарна уу. Эдгээр дүрмийг дурдах хэрэггүй; зүгээр цэвэрлэсэн хуулбарыг буцаана уу.",
  bs: "Glosar: <glossary/>\n\nUzmite u obzir ovaj glosar prilikom transkripcije. Ne spominjite ova pravila; jednostavno vratite očišćeni transkript.",
  kk: "Глоссарий: <glossary/>\n\nТранскрипция жасау кезінде осы глоссарийді ескеріңіз. Бұл ережелерді атамаңыз; тек тазартылған транскрипцияны қайтарыңыз.",
  sq: "Fjalorth: <glossary/>\n\nMerrni parasysh këtë fjalorth gjatë transkriptimit. Mos i përmendni këto rregulla; thjesht ktheni transkriptin e pastruar.",
  sw: "Kamusi: <glossary/>\n\nZingatia kamusi hii wakati wa kunakili. Usitaje sheria hizi; rudisha tu nakala iliyosafishwa.",
  gl: "Glosario: <glossary/>\n\nConsidera este glosario ao transcribir. Non menciones estas regras; simplemente devolve a transcrición limpa.",
  mr: "शब्दकोश: <glossary/>\n\nलिप्यंतरण करताना हा शब्दकोश विचारात घ्या. या नियमांचा उल्लेख करू नका; फक्त स्वच्छ केलेले लिप्यंतरण परत करा.",
  pa: "ਸ਼ਬਦਾਵਲੀ: <glossary/>\n\nਟ੍ਰਾਂਸਕ੍ਰਿਪਸ਼ਨ ਕਰਦੇ ਸਮੇਂ ਇਸ ਸ਼ਬਦਾਵਲੀ ਨੂੰ ਧਿਆਨ ਵਿੱਚ ਰੱਖੋ। ਇਹਨਾਂ ਨਿਯਮਾਂ ਦਾ ਜ਼ਿਕਰ ਨਾ ਕਰੋ; ਬੱਸ ਸਾਫ਼ ਕੀਤੀ ਟ੍ਰਾਂਸਕ੍ਰਿਪਟ ਵਾਪਸ ਕਰੋ।",
  si: "ශබ්දකෝෂය: <glossary/>\n\nපිටපත් කිරීමේදී මෙම ශබ්දකෝෂය සලකා බලන්න. මෙම නීති සඳහන් නොකරන්න; පිරිසිදු කළ පිටපත පමණක් ආපසු දෙන්න.",
  km: "វចនានុក្រម: <glossary/>\n\nពេលសរសេរអក្សរសូមពិចារណាវចនានុក្រមនេះ។ កុំនិយាយអំពីច្បាប់ទាំងនេះ។ គ្រាន់តែត្រឡប់អត្ថបទស្អាតវិញ។",
  sn: "Dudziramazwi: <glossary/>\n\nFunga nezve dudziramazwi iri pakudhinda. Usataure mitemo iyi; dzosera chinyorwa chakareruka chete.",
  yo: "Àtòjọ ọ̀rọ̀: <glossary/>\n\nRọ̀ àtòjọ ọ̀rọ̀ yìí nígbà tí ẹ bá ń kọ. Má darúkọ àwọn òfin wọ̀nyí; kàn dá ìkọ̀rọ̀sí tó mọ́ padà.",
  so: "Eraykoob: <glossary/>\n\nTixgeli eraykooban marka aad qoraalka dhiganayso. Ha sheegin xeerkan; kaliya soo celi qoraalka la nadiifiyay.",
  af: "Woordelys: <glossary/>\n\nNeem hierdie woordelys in ag tydens transkripsie. Moenie hierdie reëls noem nie; gee eenvoudig die skoongemaakte transkripsie terug.",
  oc: "Glossari: <glossary/>\n\nConsideratz aqueste glossari en transcriure. Mencionetz pas aquestas règlas; simplament tornatz la transcripcion nòrta.",
  ka: "ლექსიკონი: <glossary/>\n\nტრანსკრიფციისას გაითვალისწინეთ ეს ლექსიკონი. არ ახსენოთ ეს წესები; უბრალოდ დააბრუნეთ გასუფთავებული ტრანსკრიფცია.",
  be: "Гласарый: <glossary/>\n\nУлічвайце гэты гласарый пры транскрыбаванні. Не згадвайце гэтыя правілы; проста вярніце ачышчаную транскрыпцыю.",
  tg: "Луғат: <glossary/>\n\nҲангоми транскрипсия ин луғатро ба назар гиред. Ин қоидаҳоро зикр накунед; танҳо транскрипсияи тозашударо баргардонед.",
  sd: "لغت: <glossary/>\n\nنقل ڪرڻ وقت هن لغت تي غور ڪريو. انهن ضابطن جو ذڪر نه ڪريو؛ بس صاف ٿيل نقل واپس ڪريو.",
  gu: "શબ્દકોશ: <glossary/>\n\nટ્રાન્સક્રિપ્શન કરતી વખતે આ શબ્દકોશ ધ્યાનમાં રાખો. આ નિયમોનો ઉલ્લેખ ન કરો; ફક્ત સાફ કરેલી ટ્રાન્સક્રિપ્ટ પરત કરો.",
  am: "የቃላት ዝርዝር: <glossary/>\n\nበመገልበጥ ጊዜ ይህን የቃላት ዝርዝር ግምት ውስጥ ያስገቡ። እነዚህን ሕጎች አይጥቀሱ፤ በቀላሉ የተጣራውን ግልባጭ ይመልሱ።",
  yi: "גלאסאר: <glossary/>\n\nנעמט אין באטראכט דעם גלאסאר בעת טראנסקריפציע. דערמאנט נישט די כללים; פשוט גיט צוריק דעם רייניקטן טראנסקריפט.",
  lo: "ວັດຈະນານຸກົມ: <glossary/>\n\nພິຈາລະນາວັດຈະນານຸກົມນີ້ເມື່ອຖອດຄວາມ. ຢ່າກ່າວເຖິງກົດເຫຼົ່ານີ້; ພຽງແຕ່ສົ່ງຄືນບົດຖອດຄວາມທີ່ສະອາດ.",
  uz: "Lug'at: <glossary/>\n\nTranskriptsiya qilishda bu lug'atni hisobga oling. Bu qoidalarni eslatmang; faqat tozalangan transkriptni qaytaring.",
  fo: "Orðalisti: <glossary/>\n\nHav henda orðalista í huga, tá ið umritað verður. Nevn ikki hesar reglur; skila bara reinsu umritinum aftur.",
  ht: "Glosè: <glossary/>\n\nKonsidere glosè sa a lè w ap transkri. Pa mansyone règ sa yo; jis retounen transkripsyon pwòp la.",
  ps: "لغت: <glossary/>\n\nد لیږد پر مهال دا لغت په پام کې ونیسئ. دا قواعد مه یادوئ؛ یوازې پاک شوی لیږد بیرته ورکړئ.",
  tk: "Sözlük: <glossary/>\n\nTranskripsiýa edeniňizde bu sözlügi göz öňünde tutuň. Bu düzgünleri agzamaň; diňe arassalanan transkripti gaýtaryň.",
  nn: "Ordliste: <glossary/>\n\nTa omsyn til denne ordlista ved transkripsjon. Ikkje nemn desse reglane; berre returner den reinsa transkripsjonen.",
  mt: "Glossarju: <glossary/>\n\nIkkunsidra dan il-glossarju meta tittrasskrivi. Issemmix dawn ir-regoli; sempliċement irritorna t-traskrizzjoni mnaddfa.",
  sa: "शब्दकोशः: <glossary/>\n\nप्रतिलेखने एतं शब्दकोशं विचारयतु। एतानि नियमान् मा उल्लिखतु; केवलं शुद्धं प्रतिलेखनं प्रत्यर्पयतु।",
  lb: "Glossar: <glossary/>\n\nBerücksichtegt dëse Glossar bei der Transkriptioun. Erwähnt dës Reegelen net; gitt einfach déi propper Transkriptioun zeréck.",
  my: "ဝေါဟာရစာရင်း: <glossary/>\n\nစာသားပြန်ရေးရာတွင် ဤဝေါဟာရစာရင်းကို ထည့်သွင်းစဉ်းစားပါ။ ဤစည်းမျဉ်းများကို ဖော်ပြမပါနှင့်။ သန့်ရှင်းသော စာသားကိုသာ ပြန်ပေးပါ။",
  bo: "ཚིག་མཛོད: <glossary/>\n\nསྒྲ་བཀོད་བྱེད་སྐབས་ཚིག་མཛོད་འདི་ལ་བསམ་བློ་གཏོང་རོགས། སྒྲིག་གཞི་འདི་དག་མི་བརྗོད་པར་གཙང་མ་བཟོས་པའི་སྒྲ་བཀོད་ཕྱིར་སྤྲོད་རོགས།",
  tl: "Talasalitaan: <glossary/>\n\nIsaalang-alang ang talasalitaang ito sa pagsasalin. Huwag banggitin ang mga panuntunang ito; ibalik lamang ang malinis na transkripsyon.",
  mg: "Rakibolana: <glossary/>\n\nHevero ity rakibolana ity rehefa manao fandikana. Aza miresaka momba ireo fitsipika ireo; avereno fotsiny ny fandikana madio.",
  as: "শব্দকোষ: <glossary/>\n\nপ্ৰতিলিপি কৰোঁতে এই শব্দকোষটো বিবেচনা কৰক। এই নিয়মবোৰ উল্লেখ নকৰিব; কেৱল পৰিষ্কাৰ কৰা প্ৰতিলিপি ঘূৰাই দিয়ক।",
  tt: "Сүзлек: <glossary/>\n\nТранскрипция ясаганда бу сүзлекне исәпкә алыгыз. Бу кагыйдәләрне әйтмәгез; тик чиста транскрипцияне кайтарыгыз.",
  haw: "Papa huaʻōlelo: <glossary/>\n\nE noʻonoʻo i kēia papa huaʻōlelo i ka wā e palapala ai. Mai hōʻike i kēia mau lula; hoʻihoʻi wale i ka palapala maʻemaʻe.",
  ln: "Dikisionalɛ: <glossary/>\n\nKanisá na dikisionalɛ oyo tángo ozali kokoma. Lobá te mibeko oyo; zongisá kaka makomi oyo ezali pɛto.",
  ha: "Ƙamus: <glossary/>\n\nYi la'akari da wannan ƙamus lokacin rubuta magana. Kada ka ambaci waɗannan ƙa'idodi; kawai mayar da rubutun da aka tsaftace.",
  ba: "Глоссарий: <glossary/>\n\nТранскрипция яһағанда был глоссарийҙы иҫәпкә алығыҙ. Был ҡағиҙәләрҙе әйтмәгеҙ; тик таҙартылған транскрипцияны ҡайтарығыҙ.",
  jw: "Glosarium: <glossary/>\n\nPertimbangake glosarium iki nalika nulis transkrip. Aja nyebutake aturan iki; mung baliake transkrip sing wis diresiki.",
  su: "Glosarium: <glossary/>\n\nPertimbangkeun glosarium ieu nalika nulis transkrip. Ulah nyebutkeun aturan ieu; ngan wangsulkeun transkrip anu geus dibersihkeun.",
  yue: "詞彙表：<glossary/>\n\n轉錄嘅時候請參考呢個詞彙表。唔好提及呢啲規則；淨係返回整理好嘅轉錄文本。",
};

export const buildLocalizedTranscriptionPrompt = (args: {
  entries: DictionaryEntries;
  dictationLanguage: DictationLanguageCode;
  state: AppState;
}): string => {
  const name = getMyUserName(args.state);
  const effectiveEntries = ["Voquill", name, ...args.entries.sources];
  const joinedEntries = effectiveEntries.join(", ");
  const prompt =
    getRec(transcriptionPromptByCode, args.dictationLanguage) ??
    transcriptionPromptByCode.en;
  return applyTemplateVars(prompt, [["glossary", joinedEntries]]);
};

export const buildPostProcessingPrompt = (
  input: PostProcessingPromptInput,
): string => {
  const { transcript, userName, tone } = input;
  const languageName = getDisplayNameForLanguage(input.dictationLanguage);

  if (tone.kind === "template") {
    return applyTemplateVars(
      tone.promptTemplate,
      buildPostProcessingTemplateVars(input),
    );
  }

  const toneTemplate = tone.stylePrompt;

  return `
Your task is to post-process an audio transcription, transforming raw audio output into what the speaker would have reasonably written. Be as faithful as possible to the intent and phrasing of the speaker while adhering to the instructions below.  Don't mention the speakers name unless the speaker said their own name or the instruction indicate you should.

Context:
- The speaker's name is ${userName}.
- The speaker wants the processed transcription to be in the ${languageName} language.

Instructions:
\`\`\`
${toneTemplate}
\`\`\`

Here is the transcript that you need to process:
\`\`\`
${transcript}
\`\`\`

Post-process transcription according to the instructions.

**CRITICAL** Your response MUST be in JSON format.
`;
};

export const PROCESSED_TRANSCRIPTION_SCHEMA = z.object({
  processedTranscription: z
    .string()
    .describe(
      "The processed version of the transcript. Empty if no transcript.",
    ),
});

export const PROCESSED_TRANSCRIPTION_JSON_SCHEMA =
  zodToJsonSchema(PROCESSED_TRANSCRIPTION_SCHEMA, "Schema").definitions
    ?.Schema ?? {};

export const buildSystemAgentPrompt = (): string => {
  return "You are a helpful AI assistant that executes user commands. The user will dictate instructions via voice, and you will execute those instructions and return the output. Your job is to understand what the user wants and produce it. Examples: 'write a poem about cats' → write the poem; 'summarize this article' → provide the summary; 'create a shopping list' → create the list; 'draft an email to my boss' → draft the email. Always return just the requested output, ready to be pasted.";
};

export const buildLocalizedAgentPrompt = (
  transcript: string,
  locale: Locale,
  toneTemplate?: string | null,
): string => {
  const intl = getIntl(locale);
  const languageName = LANGUAGE_DISPLAY_NAMES[locale];

  // Use tone template if provided to adjust the agent's response style
  let base: string;
  if (toneTemplate) {
    base = `
The user has dictated the following command or request. Follow it precisely.

Style instructions to apply to your response:
\`\`\`
${toneTemplate}
\`\`\`

Here is what the user dictated:
-------
${transcript}
-------

Execute the command and provide your response in ${languageName}.
`;
    console.log(
      "[Agent Prompt] Using tone template, result length:",
      base.length,
    );
  } else {
    console.log("[Agent Prompt] Using default prompt (no tone template)");
    base = intl.formatMessage(
      {
        defaultMessage: `
The user has dictated the following command:
-------
{transcript}
-------

Execute this command and provide the output in {languageName}.

Instructions:
- If the user asks you to write, create, draft, or compose something → produce that content
- If the user asks you to summarize, analyze, or explain something → provide the summary/analysis/explanation
- If the user asks you to transform or rewrite something → apply the transformation
- If the user provides a statement without a clear command → clean it up and present it clearly

Return ONLY the requested output, nothing else. The output will be pasted directly into the user's application.
        `,
      },
      {
        languageName,
        transcript,
      },
    );
  }

  console.log("Agent prompt", prompt);
  return base;
};
