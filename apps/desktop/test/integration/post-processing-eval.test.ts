import { describe, test, vi } from "vitest";
import {
  buildLocalizedPostProcessingPrompt,
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
  const ppPrompt = buildLocalizedPostProcessingPrompt({
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

describe("default style", () => {
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

describe("custom styling", () => {
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

describe("verbatim style", () => {
  test("removes filler words but preserves phrasing", async () => {
    await runPostProcessingEval({
      transcription:
        "So um I was thinking that like maybe we could you know try a different approach",
      tone: getWritingStyle("verbatim"),
      evals: [
        {
          criteria:
            "It should remove filler words like um, like, you know",
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
            "It should not change any word choices or rephrase the sentence",
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
          criteria:
            "It should not rephrase or restructure the sentence",
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
