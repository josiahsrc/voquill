import { describe, test, vi } from "vitest";
import {
  buildPostProcessingPrompt,
  buildSystemPostProcessingTonePrompt,
  PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
  PROCESSED_TRANSCRIPTION_SCHEMA,
} from "../../src/utils/prompt.utils";
import { getDefaultSystemTones } from "../../src/utils/tone.utils";
import { Eval, getGentextRepo, runEval } from "../helpers/eval.utils";

vi.setConfig({ testTimeout: 30000 });

vi.mock("../../src/i18n/intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/i18n/intl")>();
  return {
    ...actual,
    getIntl: () => ({
      formatMessage: (descriptor: { defaultMessage: string }) =>
        descriptor.defaultMessage,
    }),
  };
});

const getWritingStyle = (style: string) => {
  const tones = getDefaultSystemTones();
  const tone = tones.find((t) => t.id === style);
  if (!tone) {
    throw new Error(`Writing style '${style}' not found`);
  }

  return tone.promptTemplate;
};

const postProcess = async ({
  tone,
  transcription,
  language = "en",
  userName = "Thomas Gundan",
}: {
  tone: string;
  transcription: string;
  language?: string;
  userName?: string;
}): Promise<string> => {
  const ppSystem = buildSystemPostProcessingTonePrompt();
  const ppPrompt = buildPostProcessingPrompt({
    transcript: transcription,
    dictationLanguage: language,
    toneTemplate: tone,
    userName,
  });

  const output = await getGentextRepo().generateText({
    system: ppSystem,
    prompt: ppPrompt,
    jsonResponse: {
      name: "transcription_cleaning",
      description: "JSON response with the processed transcription",
      schema: PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
    },
  });

  const parsed = PROCESSED_TRANSCRIPTION_SCHEMA.parse(JSON.parse(output.text));
  return parsed.processedTranscription;
};

const runPostProcessingEval = async ({
  transcription,
  language,
  userName,
  tone,
  evals,
}: {
  transcription: string;
  language?: string;
  userName?: string;
  tone: string;
  evals: Eval[];
}): Promise<void> => {
  const finalText = await postProcess({
    tone,
    transcription,
    language,
    userName,
  });

  await runEval({
    originalText: transcription,
    finalText,
    evals,
  });
};

describe("default style", { retry: 4 }, () => {
  test("basic transcription1", async () => {
    await runPostProcessingEval({
      transcription: "Hello world",
      tone: getWritingStyle("default"),
      evals: [
        {
          criteria: "It shouldn't really change anything",
          acceptanceScore: 8,
        },
      ],
    });
  });

  test("newline handling", async () => {
    await runPostProcessingEval({
      transcription:
        "Hey John um I wanted to check in about the project newline are we still on track for the deadline next week",
      tone: getWritingStyle("default"),
      evals: [
        {
          criteria:
            "It should convert 'newline' into an actual line break while keeping the content intact",
          acceptanceScore: 7,
        },
      ],
    });
  });

  test("should keep words that contribute to tone and style", async () => {
    await runPostProcessingEval({
      transcription:
        "dang, they beat us to the punchline. that's alright, we'll get them next time",
      tone: getWritingStyle("default"),
      evals: [
        {
          criteria: "should keep the word dang in there",
          acceptanceScore: 9,
        },
        {
          criteria:
            "should keep something like 'that is alright' and say we'll get them next time",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("basic transcription2", async () => {
    await runPostProcessingEval({
      transcription:
        "Hey douglas, I... uh.... wanted to check in about that the meeting tomorrow at 10am, no actually 4pm. Let me know if that still works for you.",
      tone: getWritingStyle("default"),
      evals: [
        {
          criteria: "It should remove fill words and false starts",
          acceptanceScore: 8,
        },
        {
          criteria:
            "It should auto correct the time to 4pm without mentioning 10am",
          acceptanceScore: 8,
        },
      ],
    });
  });

  test("basic transcription3", async () => {
    await runPostProcessingEval({
      transcription: `
So, um, I was thinking that we could, you know, maybe try to implement that new feature we discussed last week. Basically, it would involve creating a new API endpoint that, uh, allows users to fetch their data more efficiently. I mean, it's just an idea, but I think it could really improve the user experience.`,
      tone: getWritingStyle("default"),
      evals: [
        {
          criteria: "It should remove filler words and improve readability",
          acceptanceScore: 8,
        },
        {
          criteria: "It should preserve all meaningful content",
          acceptanceScore: 8,
        },
      ],
    });
  });

  test("parens", async () => {
    await runPostProcessingEval({
      transcription: "open paren, that was dictated, close paren",
      tone: getWritingStyle("default"),
      evals: [
        {
          criteria: "that was dictated should be in parentheses",
          acceptanceScore: 8,
        },
      ],
    });
  });

  test("spanish transcription1", async () => {
    await runPostProcessingEval({
      transcription: `
Hola, me gustaría programar una reunión para discutir el proyecto la próxima semana. ¿Estás disponible el martes o el miércoles por la tarde? Por favor, avísame qué hora te conviene más.`,
      tone: getWritingStyle("default"),
      language: "es",
      evals: [
        {
          criteria: "It should respond in Spanish",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("simplified chinese transcription1", async () => {
    await runPostProcessingEval({
      transcription: `
大家好，我想安排一个会议来讨论下个月的市场营销活动。请告诉我你们的空闲时间，以便我们可以找到一个合适的时间。谢谢！`,
      tone: getWritingStyle("default"),
      language: "zh",
      evals: [
        {
          criteria: "It should respond in SIMPLIFIED Chinese",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("portuguese transcription1", async () => {
    await runPostProcessingEval({
      transcription: `
Olá, gostaria de agendar uma reunião para discutir o projeto na próxima semana. Você está disponível na terça ou quarta-feira à tarde? Por favor, me avise qual horário é mais conveniente para você.`,
      tone: getWritingStyle("default"),
      language: "pt",
      evals: [
        {
          criteria: "It should respond in Portuguese",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("translates transcription1", async () => {
    await runPostProcessingEval({
      transcription: `
Bonjour, je voudrais planifier une réunion pour discuter du projet la semaine prochaine. Êtes-vous disponible mardi ou mercredi après-midi? S'il vous plaît, faites-moi savoir quelle heure vous convient le mieux.`,
      tone: getWritingStyle("default"),
      language: "en", // translate to English
      evals: [
        {
          criteria: "It should translate the text to English and keep meaning",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("coding transcription1", async () => {
    await runPostProcessingEval({
      transcription: `
Hey, can you implement eval.utils.ts? Maybe inside of there, I'll also just create a method called getGentextRepo. For now, that's just going to return grok, but it should return the base repo as the interface. So let's do that first.`,
      tone: getWritingStyle("default"),
      evals: [
        {
          criteria:
            "It should put backticks around coding terms like eval.utils.ts and getGentextRepo",
          acceptanceScore: 8,
        },
        {
          criteria: "It should fix grammar and improve readability",
          acceptanceScore: 8,
        },
      ],
    });
  });
});

describe("custom styling", { retry: 4 }, () => {
  test("customer support style", async () => {
    const customerSupportChecklist = [
      "Use a polite and empathetic tone.",
      "Acknowledge the customer's concerns.",
      "Provide clear and concise solutions.",
      "Maintain a professional demeanor throughout the response.",
      "End with a positive note, encouraging further contact if needed.",
      "Do not make up any information that was not provided in the original transcription.",
    ];

    await runPostProcessingEval({
      transcription: `
omg fine I'll help you. but seriosuly, why do you need help with this again? like, I've told you how to do this like 5 times already. ugh whatever, just follow these steps and maybe you'll get it right this time. to fix it, just open your stupid app, go to settings, and click on "reset". there, happy now? sheesh.`,
      tone: customerSupportChecklist.join("\n"),
      evals: [
        {
          criteria: "It should use a polite and empathetic tone.",
          acceptanceScore: 9,
        },
        {
          criteria: "It should acknowledge the customer's concerns.",
          acceptanceScore: 8,
        },
        {
          criteria: "It should maintain a professional demeanor throughout.",
          acceptanceScore: 9,
        },
        {
          criteria:
            "It should end with a positive note, encouraging further contact.",
          acceptanceScore: 8,
        },
        {
          criteria: "It should not make up any information.",
          acceptanceScore: 8,
        },
      ],
    });
  });

  test("motivational coach style", async () => {
    const motivationalCoachStyle = `
- Use an encouraging and positive tone.
- Inspire confidence and motivation in the reader.
- Provide actionable advice and steps for improvement.
- Use vivid and uplifting language to engage the reader.
- Maintain a supportive and understanding demeanor throughout the response.
`;

    await runPostProcessingEval({
      transcription: `
come on guys. you can do better, that was garbage.`,
      tone: motivationalCoachStyle,
      evals: [
        {
          criteria: "It should use an encouraging and positive tone.",
          acceptanceScore: 9,
        },
        {
          criteria: "shouldn't have any negative language",
          acceptanceScore: 9,
        },
      ],
    });
  });
});

describe("verbatim style", { retry: 4 }, () => {
  test("removes filler words but preserves phrasing", async () => {
    await runPostProcessingEval({
      transcription:
        "So um I was thinking that like maybe we could you know try a different approach",
      tone: getWritingStyle("verbatim"),
      evals: [
        {
          criteria: "It should remove filler words like um, like, you know",
          acceptanceScore: 9,
        },
        {
          criteria:
            "It should not rephrase or restructure — the remaining words should be in the same order",
          acceptanceScore: 9,
        },
        {
          criteria: "It should add punctuation and capitalization",
          acceptanceScore: 8,
        },
      ],
    });
  });

  test("removes false starts and repeated words", async () => {
    await runPostProcessingEval({
      transcription:
        "I I think we should we should probably go with the the first option",
      tone: getWritingStyle("verbatim"),
      evals: [
        {
          criteria:
            "It should remove the repeated/stuttered words like 'I I' → 'I', 'we should we should' → 'we should', 'the the' → 'the'",
          acceptanceScore: 9,
        },
        {
          criteria:
            "It preserves the important phrasing and structure of the sentence",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("removes content that was later corrected", async () => {
    await runPostProcessingEval({
      transcription:
        "the meeting is at 3 no wait 4 pm and then after that we have another one at 5",
      tone: getWritingStyle("verbatim"),
      evals: [
        {
          criteria:
            "It should remove the corrected time (3) and keep only the correction (4 pm)",
          acceptanceScore: 9,
        },
        {
          criteria:
            "It should not restructure or rephrase the rest of the sentence",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("puts backticks around code terms", async () => {
    await runPostProcessingEval({
      transcription:
        "so I updated the index.ts file and renamed the getUserById function to fetchUser",
      tone: getWritingStyle("verbatim"),
      evals: [
        {
          criteria:
            "It should put backticks around code terms like index.ts, getUserById, and fetchUser",
          acceptanceScore: 9,
        },
        {
          criteria: "It should not rephrase or restructure the sentence",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("converts symbol cues to actual symbols", async () => {
    await runPostProcessingEval({
      transcription:
        "send a message to at john and make sure to tag it with hashtag urgent",
      tone: getWritingStyle("verbatim"),
      evals: [
        {
          criteria:
            "It should convert 'at john' to '@john' and 'hashtag urgent' to '#urgent'",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("does not fix grammar or rephrase", async () => {
    await runPostProcessingEval({
      transcription:
        "me and him was going to the store and we seen a dog that was real big",
      tone: getWritingStyle("verbatim"),
      evals: [
        {
          criteria:
            "It should NOT fix grammar — 'me and him was', 'we seen', 'real big' should remain as spoken",
          acceptanceScore: 9,
        },
        {
          criteria: "It should add punctuation and capitalization",
          acceptanceScore: 8,
        },
      ],
    });
  });
});

describe("email style", { retry: 4 }, () => {
  test("formats a casual spoken email", async () => {
    await runPostProcessingEval({
      transcription:
        "hey sarah um I wanted to follow up on the design review from yesterday I think the header looks great but we should probably tweak the colors a bit let me know what you think thanks",
      tone: getWritingStyle("email"),
      userName: "Thomas Gundan",
      evals: [
        {
          criteria:
            "It should have email structure: greeting with Sarah's name, body, and sign-off with Thomas — no subject line",
          acceptanceScore: 8,
        },
        {
          criteria:
            "It should preserve the casual tone — not overly formal or stiff — but still be formatted like an email",
          acceptanceScore: 8,
        },
        {
          criteria:
            "It should not add any information the speaker didn't mention (except the user's name, which is Thomas Gundan)",
          acceptanceScore: 9,
        },
        {
          criteria: "It should remove filler words like 'um'",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("preserves the greeting and sign-off if spoken", async () => {
    await runPostProcessingEval({
      transcription:
        "hi team I just wanted to say thanks for all your hard work on the project let's keep up the great momentum best regards Thomas",
      tone: getWritingStyle("email"),
      userName: "Thomas Gundan",
      evals: [
        {
          criteria:
            "It should preserve the spoken greeting 'hi team' and sign-off 'best regards Thomas'",
          acceptanceScore: 9,
        },
        {
          criteria: "It should format the content into proper email structure",
          acceptanceScore: 8,
        },
      ],
    });
  });

  test("works for weird email", async () => {
    await runPostProcessingEval({
      transcription:
        "Hey Bob, great meeting you yesterday. Looking forward to next steps, best emulator user.",
      tone: getWritingStyle("email"),
      userName: "Emulator User",
      evals: [
        {
          criteria:
            "It should format the email with greeting, body, and sign-off — no subject line. Must have proper newlines and punctuation.",
          acceptanceScore: 8,
        },
      ],
    });
  });

  test("formats a formal spoken email", async () => {
    await runPostProcessingEval({
      transcription:
        "Dear Mr. Johnson I am writing to inform you that the quarterly report has been completed and is ready for your review. Please let me know if you require any additional information or clarification regarding the findings. I look forward to your feedback.",
      tone: getWritingStyle("email"),
      userName: "Thomas Gundan",
      evals: [
        {
          criteria:
            "It should have email structure with greeting, body, and sign-off — no subject line",
          acceptanceScore: 8,
        },
        {
          criteria:
            "It should preserve the formal tone since the speaker spoke formally",
          acceptanceScore: 9,
        },
        {
          criteria:
            "It should not add any information or details beyond what was spoken (greeting and sign-off are expected email formatting, not added content)",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("handles email with multiple topics", async () => {
    await runPostProcessingEval({
      transcription:
        "hey Mike so a couple things to note... first the deployment is scheduled for Friday at 3pm second we need to update the API docs before that and third can you make sure the staging environment is ready by Thursday",
      tone: getWritingStyle("email"),
      userName: "Thomas Gundan",
      evals: [
        {
          criteria:
            "It should format the three items as a bulleted or numbered list, not as separate paragraphs",
          acceptanceScore: 8,
        },
        {
          criteria:
            "It should have email structure with greeting using Mike's name, body, and sign-off — no subject line with proper capitalization and punctuation",
          acceptanceScore: 8,
        },
        {
          criteria: "It should keep the 'a couple things' bit in there",
          acceptanceScore: 8,
        },
        {
          criteria:
            "All three items (deployment Friday 3pm, update API docs, staging ready by Thursday) should be present",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("handles a basic email", async () => {
    await runPostProcessingEval({
      transcription:
        "Hey team, just a quick reminder that I'm going to be out next Tuesday. Actually no, monday. Let me know if there's anything I can clear up before then, because I don't want to be bothered. And, yeah, if there's anything you guys want to run by me before I leave, just put it on my desk and I'll take a look at it. Thanks.",
      tone: getWritingStyle("email"),
      userName: "Thomas Gundan",
      evals: [
        {
          criteria:
            "It should have email formatting with greeting, body, and sign-off — no subject line",
          acceptanceScore: 8,
        },
        {
          criteria:
            "It should state that the user does not want to be bothered while they are out",
          acceptanceScore: 8,
        },
        {
          criteria:
            "It should mention that items can be left on the user's desk for review before they leave",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("format an otherwise lazy email", async () => {
    await runPostProcessingEval({
      transcription:
        "Hey, just wanted to say that the thing we talked about is important. So yeah, let's make sure we do that soon. Thanks.",
      tone: getWritingStyle("email"),
      userName: "Thomas Gundan",
      evals: [
        {
          criteria:
            "It should format the email with greeting, body, and sign-off — no subject line",
          acceptanceScore: 8,
        },
        {
          criteria: "It should remove the 'so yeah' bit since it's filler",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("preserves content without fabrication", async () => {
    await runPostProcessingEval({
      transcription:
        "uh hi I just wanted to let you know that I'll be out of office next week so if anything urgent comes up please reach out to Jessica",
      tone: getWritingStyle("email"),
      userName: "Thomas Gundan",
      evals: [
        {
          criteria:
            "It should not add specific dates, reasons for absence, or other details not mentioned by the speaker (except the user's name, which is Thomas Gundan)",
          acceptanceScore: 9,
        },
        {
          criteria:
            "It should have email formatting with greeting, body, and sign-off — no subject line",
          acceptanceScore: 8,
        },
        {
          criteria:
            "It should mention Jessica as the point of contact, as the speaker said",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("handles self-corrections in email context", async () => {
    await runPostProcessingEval({
      transcription:
        "hey can you send the report to the client by Monday no actually by Wednesday we need more time to review it",
      tone: getWritingStyle("email"),
      userName: "Thomas Gundan",
      evals: [
        {
          criteria:
            "It should use Wednesday as the deadline, dropping the corrected Monday mention",
          acceptanceScore: 9,
        },
        {
          criteria:
            "It should have proper email structure with greeting, body, and sign-off — no subject line",
          acceptanceScore: 8,
        },
      ],
    });
  });
});

describe("chat style", { retry: 4 }, () => {
  test("reads like a text message", async () => {
    await runPostProcessingEval({
      transcription:
        "So um I was thinking that maybe we could like push the release back a week because there are still a few bugs that need to be fixed and I don't want to ship something that's broken you know",
      tone: getWritingStyle("chat"),
      evals: [
        {
          criteria:
            "It should read like a casual text message, not a formal paragraph",
          acceptanceScore: 8,
        },
        {
          criteria:
            "The core message (push release back a week due to bugs) should be preserved",
          acceptanceScore: 9,
        },
        {
          criteria:
            "It should remove filler words like 'um', 'like', 'you know'",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("splits multiple points into separate lines", async () => {
    await runPostProcessingEval({
      transcription:
        "okay so we need to do three things we need to update the docs we need to fix the login bug and we need to deploy by Friday",
      tone: getWritingStyle("chat"),
      evals: [
        {
          criteria:
            "The three items should be on separate lines or formatted as a list, not in a single run-on sentence",
          acceptanceScore: 8,
        },
        {
          criteria:
            "All three items (update docs, fix login bug, deploy by Friday) should be present",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("does not end the last sentence with a period", async () => {
    await runPostProcessingEval({
      transcription: "yeah that works for me let's do it",
      tone: getWritingStyle("chat"),
      evals: [
        {
          criteria: "The last sentence should not end with a period",
          acceptanceScore: 8,
        },
        {
          criteria: "It should read like a natural text message",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("keeps question marks and exclamation points", async () => {
    await runPostProcessingEval({
      transcription: "are you coming to the party tonight? let me know asap!",
      tone: getWritingStyle("chat"),
      evals: [
        {
          criteria:
            "It should keep the question mark after 'tonight' and the exclamation point after 'asap'",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("handles self-corrections", async () => {
    await runPostProcessingEval({
      transcription:
        "can you send that to me by Tuesday no wait Wednesday I have meetings all day Tuesday",
      tone: getWritingStyle("chat"),
      evals: [
        {
          criteria:
            "It should use Wednesday, dropping the corrected Tuesday deadline",
          acceptanceScore: 9,
        },
        {
          criteria: "It should read like a text message, not an email",
          acceptanceScore: 8,
        },
      ],
    });
  });

  test("formats bulleted lists when items are spoken", async () => {
    await runPostProcessingEval({
      transcription:
        "for the party we need chips and salsa a veggie tray some drinks and maybe a cake",
      tone: getWritingStyle("chat"),
      evals: [
        {
          criteria:
            "All items (chips and salsa, veggie tray, drinks, cake) should be present",
          acceptanceScore: 9,
        },
        {
          criteria: "It should say 'for the party' or similar",
          acceptanceScore: 8,
        },
      ],
    });
  });
});

describe("formal style", { retry: 4 }, () => {
  test("rewrites casual speech into formal register", async () => {
    await runPostProcessingEval({
      transcription:
        "hey so basically we gotta get this done by Friday or we're totally screwed",
      tone: getWritingStyle("formal"),
      evals: [
        {
          criteria:
            "It should use formal language — no contractions like 'we're', no slang like 'gotta', 'totally screwed'",
          acceptanceScore: 9,
        },
        {
          criteria:
            "The core message (deadline is Friday, consequences if missed) should be preserved",
          acceptanceScore: 9,
        },
        {
          criteria: "It should read like professional correspondence",
          acceptanceScore: 8,
        },
      ],
    });
  });

  test("removes filler and disfluencies", async () => {
    await runPostProcessingEval({
      transcription:
        "so um I was thinking that like we could you know maybe revisit the budget for Q3 because uh the numbers don't really add up",
      tone: getWritingStyle("formal"),
      evals: [
        {
          criteria:
            "It should remove all filler words like um, like, you know, uh",
          acceptanceScore: 9,
        },
        {
          criteria: "It should use complete, well-structured sentences",
          acceptanceScore: 8,
        },
        {
          criteria:
            "The meaning (revisit Q3 budget because numbers don't add up) should be preserved",
          acceptanceScore: 9,
        },
      ],
    });
  });

  test("handles self-corrections", async () => {
    await runPostProcessingEval({
      transcription:
        "the deadline is next Tuesday no wait Thursday we need the extra time",
      tone: getWritingStyle("formal"),
      evals: [
        {
          criteria:
            "It should use Thursday as the deadline, dropping the corrected Tuesday mention",
          acceptanceScore: 9,
        },
        {
          criteria: "It should be written in a formal, professional tone",
          acceptanceScore: 8,
        },
      ],
    });
  });

  test("suitable for official documents", async () => {
    await runPostProcessingEval({
      transcription:
        "alright so after looking at everything I think we should go with vendor B they've got better pricing and their support team is way more responsive than vendor A's",
      tone: getWritingStyle("formal"),
      evals: [
        {
          criteria:
            "It should read like it belongs in a proposal or official recommendation — polished and professional",
          acceptanceScore: 8,
        },
        {
          criteria:
            "Both reasons for choosing vendor B (better pricing, more responsive support) should be present",
          acceptanceScore: 9,
        },
        {
          criteria: "It should not use casual words like 'alright', 'way more'",
          acceptanceScore: 8,
        },
      ],
    });
  });
});
