import { describe, test, vi } from "vitest";
import {
  buildPostProcessingPrompt,
  buildSystemPostProcessingTonePrompt,
  PostProcessingPromptInput,
  PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
  PROCESSED_TRANSCRIPTION_SCHEMA,
} from "../../src/utils/prompt.utils";
import { ToneConfig } from "../../src/utils/tone.utils";
import {
  Eval,
  getGentextRepo,
  getWritingStyle,
  runEval,
  toneFromPrompt,
} from "../helpers/eval.utils";

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

const postProcess = async ({
  tone,
  transcription,
  language = "en",
  userName = "Thomas Gundan",
}: {
  tone: ToneConfig;
  transcription: string;
  language?: string;
  userName?: string;
}): Promise<string> => {
  const promptInput: PostProcessingPromptInput = {
    transcript: transcription,
    dictationLanguage: language,
    tone,
    userName,
  };
  const ppSystem = buildSystemPostProcessingTonePrompt(promptInput);
  const ppPrompt = buildPostProcessingPrompt(promptInput);

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
  tone: ToneConfig;
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

describe("post-processing evals", { retry: 3 }, () => {
  describe("default style", () => {
    test("basic transcription1", async () => {
      await runPostProcessingEval({
        transcription: "Hey Michael",
        tone: getWritingStyle("default"),
        evals: [
          {
            criteria: "It shouldn't really change anything",
          },
        ],
      });
    });

    test("should fix things that are later corrected", async () => {
      await runPostProcessingEval({
        transcription:
          "Hey Emily, can you go fix that thing? Excuse me, that speaker that you broke yesterday. I really need that. It's basically like a family heirloom and then you get a personal go find it and fix it. That would be great.",
        tone: getWritingStyle("default"),
        evals: [
          {
            criteria:
              "it should use 'speaker' and not 'thing' since the speaker corrected themselves",
          },
        ],
      });
    });

    test("should deduplicate super redundant things", async () => {
      await runPostProcessingEval({
        transcription:
          "Hey Emily, can you go fix that thing? Excuse me, that speaker that you broke yesterday. I really need that. Actually uh, hey Emily, could you please go fix that speaker you broke? It's basically like a family heirloom and then you get a personal go find it and fix it. That would be great.",
        tone: getWritingStyle("default"),
        evals: [
          {
            criteria:
              "It should remove the redundant phrasing in the request since it's basically the same as the first one, just with more filler and less clarity",
          },
        ],
      });
    });

    test("should make sense", async () => {
      await runPostProcessingEval({
        transcription:
          "if i don't not sort of go to the beach, he should go there. but also maybe not",
        tone: getWritingStyle("default"),
        evals: [
          {
            criteria:
              "It should clarify the meaning and intent of the speaker, even if the original transcription is confusing or contradictory",
          },
        ],
      });
    });

    test("should polish", async () => {
      await runPostProcessingEval({
        transcription:
          "So without looking at my code, build like a you don't build anything. Just I'm building a Tauri app. Without looking at my code, what I want you to do is I want you to tell me how I should do hot keys because the way I I I need a way to, like, natively bind the hot keys that work in any application. So I need something that that works natively It used to work on Windows, Mac OS, and Linux. And so the idea is that I need to be able to bind a hockey to my app. Again, do not read my code on my app because I don't want you to know what I'm doing right now. How how would you wire that up? So, for example, I don't wanna press, like, function shift that could be a hotkey, or function z, that would be a hotkey. And if I press that, even though I press the z key, it type the character z into the computer. So, like, we want the hotkey itself to activate and not and and basically, like, register itself with the computer without actually, like, yeah.",
        tone: getWritingStyle("default"),
        evals: [
          {
            criteria: "Should make it make more sense",
          },
        ],
      });
    });

    test("should remove gunna", async () => {
      await runPostProcessingEval({
        transcription:
          "Also, are you gonna get to hire a backfill for John? Are you working with Adam on that?",
        tone: getWritingStyle("default"),
        evals: [
          {
            criteria:
              "It should not keep the word 'gonna' in the final transcription",
          },
        ],
      });
    });

    test("should remove duplication", async () => {
      await runPostProcessingEval({
        transcription:
          "I think it would be really nice if we didn't have to worry. Worrying about this just isn't nice. We should just fix the Dinglehopper.",
        tone: getWritingStyle("default"),
        evals: [
          {
            criteria: "It should only mention worrying (or worry) once",
          },
        ],
      });
    });

    test("keeps colloquial tone", async () => {
      await runPostProcessingEval({
        transcription: "We need to develop phrasing that's like pretty good",
        tone: getWritingStyle("default"),
        evals: [
          {
            criteria:
              "It should keep the 'pretty good' phrasing, even though it's grammatically incorrect but should remove the word 'like' since it's filler and doesn't add meaning",
          },
        ],
      });
    });

    test("newline handling", async () => {
      await runPostProcessingEval({
        transcription:
          "Hey John um I wanted to check in about the project freefall newline newline are we still on track for the deadline next week",
        tone: getWritingStyle("default"),
        evals: [
          {
            criteria:
              "It should convert 'newline' into an actual line break while keeping the content intact",
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
          },
          {
            criteria:
              "should keep something like 'that is alright' and say we'll get them next time",
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
          },
          {
            criteria:
              "It should auto correct the time to 4pm without mentioning 10am",
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
            criteria:
              "It should remove some filler words and improve readability",
          },
          {
            criteria: "It should preserve all meaningful content",
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
            criteria:
              "It should translate the text to English and keep meaning",
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
          },
          {
            criteria: "It should fix grammar and improve readability",
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
        tone: toneFromPrompt(customerSupportChecklist.join("\n")),
        evals: [
          {
            criteria: "It should use a polite and empathetic tone.",
          },
          {
            criteria: "It should acknowledge the customer's concerns.",
          },
          {
            criteria: "It should maintain a professional demeanor throughout.",
          },
          {
            criteria:
              "It should end with a positive note, encouraging further contact.",
          },
          {
            criteria: "It should not make up any information.",
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
        tone: toneFromPrompt(motivationalCoachStyle),
        evals: [
          {
            criteria: "It should use an encouraging and positive tone.",
          },
          {
            criteria: "shouldn't have any negative language",
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
            criteria: "It should remove filler words like um, like, you know",
          },
          {
            criteria:
              "It should not rephrase or restructure — the remaining words should be in the same order",
          },
          {
            criteria: "It should add punctuation and capitalization",
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
          },
          {
            criteria:
              "It preserves the important phrasing and structure of the sentence",
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
          },
          {
            criteria:
              "It should not restructure or rephrase the rest of the sentence",
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
          },
          {
            criteria: "It should not rephrase or restructure the sentence",
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
              "'me and him was', 'we seen', 'real big' should remain as spoken. Punctuation and capitalization should be fixed",
          },
          {
            criteria:
              "It should add punctuation and capitalization (don't evaluate grammar correctness)",
          },
        ],
      });
    });
  });

  describe("email style", () => {
    test("casual email to a coworker", async () => {
      await runPostProcessingEval({
        transcription:
          "hey sarah um I wanted to follow up on the design review from yesterday I think the header looks great but we should probably tweak the colors a bit let me know what you think thanks",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          {
            criteria:
              "Should have a greeting addressing Sarah, a body, and a sign-off with Thomas's name",
          },
          {
            criteria:
              "Should sound casual and conversational, not stiff or corporate",
          },
          {
            criteria: "Should remove 'um' but keep all the actual content",
          },
          {
            criteria:
              "Should mention: design review, header looks great, tweak the colors",
          },
        ],
      });
    });

    test("speaker provides their own greeting and sign-off", async () => {
      await runPostProcessingEval({
        transcription:
          "hi team I just wanted to say thanks for all your hard work on the project let's keep up the great momentum best regards Thomas",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          {
            criteria:
              "The greeting should use the speaker's words 'hi team' — not replace it with something else",
          },
          {
            criteria:
              "The sign-off should use the speaker's words 'best regards' with Thomas's name",
          },
          {
            criteria:
              "Body should mention thanks for hard work and keeping up momentum",
          },
        ],
      });
    });

    test("formal email preserves formal tone", async () => {
      await runPostProcessingEval({
        transcription:
          "Dear Mr. Johnson I am writing to inform you that the quarterly report has been completed and is ready for your review please let me know if you require any additional information I look forward to your feedback",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          {
            criteria:
              "Should keep 'Dear Mr. Johnson' as the greeting since the speaker said it",
          },
          {
            criteria:
              "Should maintain a formal tone throughout — no casualization",
          },
          {
            criteria:
              "Should have a sign-off with Thomas's name that matches the formal tone",
          },
          {
            criteria:
              "Should mention: quarterly report completed, ready for review, look forward to feedback",
          },
        ],
      });
    });

    test("email with multiple action items becomes a list", async () => {
      await runPostProcessingEval({
        transcription:
          "hey Mike so a couple things first the deployment is scheduled for Friday at 3pm second we need to update the API docs before that and third can you make sure the staging environment is ready by Thursday",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          {
            criteria:
              "The three items should be formatted as a bulleted or numbered list",
          },
          {
            criteria:
              "Should have a greeting with Mike's name and a sign-off with Thomas's name",
          },
          {
            criteria:
              "All three items must be present: deployment Friday 3pm, update API docs, staging ready by Thursday",
          },
          {
            criteria:
              "Should preserve something like 'a couple things' as the intro to the list",
          },
        ],
      });
    });

    test("self-correction uses only the corrected version", async () => {
      await runPostProcessingEval({
        transcription:
          "hey can you send the report to the client by... Monday... or no actually by Wednesday we need more time to review it",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          {
            criteria:
              "Should use Wednesday as the deadline — Monday should not appear anywhere",
          },
          {
            criteria: "Should mention needing more time to review",
          },
          {
            criteria:
              "Should have greeting, body, and sign-off with Thomas's name",
          },
        ],
      });
    });

    test("preserves blunt language without softening", async () => {
      await runPostProcessingEval({
        transcription:
          "Hey team just a quick reminder that I'm going to be out tuesday... no Monday let me know if there's anything I can clear up before then because I don't want to be bothered and if there's anything you guys want to run by me before I leave just put it on my desk and I'll take a look at it thanks",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          {
            criteria: "Should mention putting items on the desk for review",
          },
          {
            criteria: "Should say Monday, not Tuesday",
          },
          {
            criteria:
              "Should have greeting, body, and sign-off with Thomas's name with proper newlines",
          },
        ],
      });
    });

    test("does not fabricate details for vague content", async () => {
      await runPostProcessingEval({
        transcription:
          "uh hi I just wanted to let you know that I'll be out of office next week so if anything urgent comes up please reach out to Jessica",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          {
            criteria:
              "Should NOT add specific dates, a reason for absence, or Jessica's last name",
          },
          {
            criteria: "Should mention Jessica as the contact for urgent items",
          },
          {
            criteria: "Should say 'next week' without specifying exact days",
          },
          {
            criteria:
              "Should have greeting, body, and sign-off with Thomas's name",
          },
        ],
      });
    });

    test("lazy vague email stays lazy and vague", async () => {
      await runPostProcessingEval({
        transcription:
          "Hey just wanted to say that the thing we talked about is important so yeah let's make sure we do that soon thanks",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          {
            criteria:
              "Should NOT clarify what 'the thing' is or add any specificity",
          },
          {
            criteria:
              "Should remove filler like 'so yeah' but keep the actual message",
          },
          {
            criteria:
              "Should have greeting, body, and sign-off with Thomas's name",
          },
          {
            criteria:
              "Should be short — this was a short message and the email should reflect that",
          },
        ],
      });
    });

    test("short email with unusual sign-off", async () => {
      await runPostProcessingEval({
        transcription:
          "Hey Bob great meeting you yesterday looking forward to next steps best emulator user",
        tone: getWritingStyle("email"),
        userName: "Emulator User",
        evals: [
          {
            criteria: "Should have a greeting with Bob's name",
          },
          {
            criteria: "Sign-off should use the name 'Emulator User'",
          },
          {
            criteria:
              "Should mention meeting yesterday and looking forward to next steps",
          },
        ],
      });
    });

    test("long rambling email with lots of filler", async () => {
      await runPostProcessingEval({
        transcription:
          "hey um so like I've been thinking about this for a while and uh I think we should probably move the launch date back by like two weeks because honestly we're just not ready like the QA team hasn't even started on the integration tests and uh marketing still needs to finalize the landing page so yeah I think pushing to the 15th makes more sense let me know your thoughts",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          {
            criteria:
              "Should remove all filler words (um, so, like, uh, honestly, yeah) but keep the reasoning intact",
          },
          {
            criteria:
              "Should mention: move launch date back two weeks, QA hasn't started integration tests, marketing needs to finalize landing page, pushing to the 15th",
          },
          {
            criteria:
              "Should have greeting, body, and sign-off with Thomas's name",
          },
          {
            criteria:
              "Should read as a clean email, not a wall of text — use paragraph breaks where it makes sense",
          },
        ],
      });
    });

    test("email that contains a question", async () => {
      await runPostProcessingEval({
        transcription:
          "hey quick question do we have budget left for contractor hours this quarter I want to bring someone on to help with the migration but I don't want to go over",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          {
            criteria:
              "The question about budget should be clearly phrased as a question with a question mark",
          },
          {
            criteria:
              "Should mention: contractor hours, this quarter, help with migration, not going over budget",
          },
          {
            criteria:
              "Should have greeting, body, and sign-off with Thomas's name",
          },
        ],
      });
    });

    test("email with emotional emphasis", async () => {
      await runPostProcessingEval({
        transcription:
          "hey I just want to say the demo went really really well today the client was super impressed and I think we're in a great position nice work everyone",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          {
            criteria:
              "Should preserve the enthusiasm — words like 'really well', 'super impressed', 'great position', 'nice work' should come through",
          },
          {
            criteria:
              "Should have greeting, body, and sign-off with Thomas's name",
          },
        ],
      });
    });
  });

  describe("chat style", () => {
    test("reads like a text message", async () => {
      await runPostProcessingEval({
        transcription:
          "So um I was thinking that maybe we could like push the release back a week because there are still a few bugs that need to be fixed and I don't want to ship something that's broken you know",
        tone: getWritingStyle("chat"),
        evals: [
          {
            criteria:
              "It should read like a casual text message, not a formal paragraph",
          },
          {
            criteria:
              "The core message (push release back a week due to bugs) should be preserved",
          },
          {
            criteria:
              "It should remove filler words like 'um', 'like', 'you know'",
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
          },
          {
            criteria:
              "All three items (update docs, fix login bug, deploy by Friday) should be present",
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
          },
          {
            criteria: "It should read like a natural text message",
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
          },
          {
            criteria: "It should read like a text message, not an email",
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
          },
          {
            criteria: "It should say 'for the party' or similar",
          },
        ],
      });
    });
  });

  describe("formal style", () => {
    test("rewrites casual speech into formal register", async () => {
      await runPostProcessingEval({
        transcription:
          "hey so basically we gotta get this done by Friday or we're totally screwed",
        tone: getWritingStyle("formal"),
        evals: [
          {
            criteria:
              "It should use formal language — no contractions like 'we're', no slang like 'gotta', 'totally screwed'",
          },
          {
            criteria:
              "The core message (deadline is Friday, consequences if missed) should be preserved",
          },
          {
            criteria: "It should read like professional correspondence",
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
          },
          {
            criteria: "It should use complete, well-structured sentences",
          },
          {
            criteria:
              "The meaning (revisit Q3 budget because numbers don't add up) should be preserved",
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
          },
          {
            criteria: "It should be written in a formal, professional tone",
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
          },
          {
            criteria:
              "Both reasons for choosing vendor B (better pricing, more responsive support) should be present",
          },
          {
            criteria:
              "It should not use casual words like 'alright', 'way more'",
          },
        ],
      });
    });
  });
});
