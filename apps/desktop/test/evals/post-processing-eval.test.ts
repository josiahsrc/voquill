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
  getGroqGentextRepo,
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

  const output = await getGroqGentextRepo(
    "meta-llama/llama-4-scout-17b-16e-instruct",
  ).generateText({
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
  const startTime = Date.now();
  const finalText = await postProcess({
    tone,
    transcription,
    language,
    userName,
  });

  const duration = (Date.now() - startTime) / 1000;
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log("Orig Text:", transcription);
  console.log("Finl Text:", finalText);

  await runEval({
    originalText: transcription,
    finalText,
    evals,
  });
};

describe("post-processing evals", { retry: 0 }, () => {
  describe("default style", () => {
    test("basic transcription1", async () => {
      await runPostProcessingEval({
        transcription: "Hey Michael",
        tone: getWritingStyle("default"),
        evals: ["It shouldn't really change anything"],
      });
    });

    test("don't answer the question", async () => {
      await runPostProcessingEval({
        transcription: "Explain what impulse is",
        tone: getWritingStyle("default"),
        evals: [
          "It should NOT answer the question, it keep it roughly the same",
        ],
      });
    });

    test("should put paragraph breaks in", async () => {
      await runPostProcessingEval({
        transcription:
          "Vielen Dank für Ihre E-Mail, und ich weiß es zu schätzen, dass Sie sich die Zeit genommen haben, alles so klar darzulegen. Ich wollte Ihnen eine durchdachte Antwort geben, weil ich merke, dass Ihnen diese Angelegenheit wichtig ist, und ich Ihnen keine hastige oder allzu vereinfachte Antwort geben möchte, wenn die Situation offensichtlich etwas komplizierter ist. Zunächst einmal verstehe ich sehr gut, woher Sie kommen, und ich glaube nicht, dass Sie überreagieren oder aus irgendetwas eine zu große Sache machen. Aus meiner Sicht scheint ein großer Teil der Spannung daher zu kommen, dass sich mehrere Dinge gleichzeitig aufgebaut haben, und auch wenn jedes einzelne für sich genommen vielleicht noch handhabbar gewesen wäre, erzeugen sie zusammengenommen ein Maß an Stress und Unsicherheit, das für jeden schwer ruhig zu bewältigen wäre. Ich finde es auch wichtig zu sagen, dass ich Ihre Bedenken nicht im negativen Sinne persönlich nehme, weil ich weiß, dass Sie ehrlich sein wollen und nicht konfrontativ, und ich würde ein direktes Gespräch, auch wenn es unangenehm ist, immer lieber führen, als zuzulassen, dass sich im Hintergrund immer mehr Annahmen aufstauen. Gleichzeitig möchte ich von meiner Seite genauso ehrlich sein und sagen, dass manches von dem, was passiert ist, nicht so absichtlich war, wie es vielleicht gewirkt hat. Es gab Situationen, in denen ich früher, klarer und verlässlicher hätte kommunizieren sollen, und ich sehe jetzt, wie mein Schweigen oder meine Verzögerung als Gleichgültigkeit, Vermeidung oder sogar Missachtung verstanden werden konnte, obwohl ich in Wirklichkeit nur versucht habe, zu viele Dinge auf einmal schlecht zu bewältigen, und am Ende genau die Verwirrung verursacht habe, die ich eigentlich hätte verhindern müssen. Das geht auf meine Kappe, und ich versuche nicht, es schönzureden. Ich möchte auch nicht, dass daraus ein Hin und Her wird, bei dem jeder von uns seinen Standpunkt so darlegt, als müsste es am Ende einen Gewinner geben, denn ich glaube nicht, dass das einem von uns helfen würde. Was ich viel lieber tun möchte, ist die Punkte anzuerkennen, in denen Sie recht haben, die Punkte zu klären, die möglicherweise missverstanden wurden, und dann herauszufinden, ob es noch einen gangbaren Weg nach vorne gibt, der sich für uns beide respektvoll, realistisch und langfristig tragfähig anfühlt. Ich glaube, dass solche Situationen manchmal schlimmer werden, weil Menschen anfangen, über die exakte Formulierung einzelner Momente zu streiten, statt über das größere Muster darunter, und dieses größere Muster ist aus meiner Sicht, dass die Erwartungen nicht aufeinander abgestimmt waren, die Kommunikation nachgelassen hat und bis zu dem Zeitpunkt, an dem einer von uns beiden wirklich erkannt hat, wie frustriert die andere Person geworden war, schon zu vieles zu lange unausgesprochen geblieben war. Das bedeutet nicht, dass die Beziehung, die Zusammenarbeit oder die Verbindung zwangsläufig irreparabel beschädigt ist, aber es bedeutet, dass ihre Wiederherstellung mehr erfordern würde als nur eine schnelle Entschuldigung oder ein beiläufiges Versprechen, es künftig besser zu machen.",
        tone: getWritingStyle("default"),
        language: "de",
        evals: [
          "It should split the text into paragraphs where it makes sense, improving readability while preserving the original content and meaning",
        ],
      });
    });

    test("should handle emojis", async () => {
      await runPostProcessingEval({
        transcription: "Hey, can you send me the report? smiley face",
        tone: getWritingStyle("default"),
        evals: ["It should convert 'smiley face' into an actual smiling emoji"],
      });
    });

    test("crazy transcript 1", async () => {
      await runPostProcessingEval({
        transcription:
          "Can you fix the Linux build? I guess so we have those two workflows. Build desktop and we also have release desktop. And I I haven't, like, super looked into this, but I'm pretty sure build desktop yeah. Yeah. Okay. Build desktop doesn't actually ship with Vulcan. And so we don't we don't want the build desktop to actually build for Voquill, and it should not build the sidecars. Or, like, it should not build the GPU sidecars rather. It doesn't need to. But it looks like our built pipeline isn't supporting that because we're getting we're getting some errors. Yeah. If I just I pasted the raw logs from the job inside of a file. You can kinda you can kinda start that file if you're interested in seeing, like, where the where the problem is. But yeah, I kind of gave the high level context to the very top of this prompt so I think you can you can see it from there too.",
        tone: getWritingStyle("default"),
        evals: ["It should make it make sense"],
      });
    });

    test("should fix things that are later corrected", async () => {
      await runPostProcessingEval({
        transcription:
          "Hey Emily, can you go fix that thing? Excuse me, that speaker that you broke yesterday. I really need that. It's basically like a family heirloom and then you get a personal go find it and fix it. That would be great.",
        tone: getWritingStyle("default"),
        evals: [
          "it should use 'speaker' and not 'thing' since the speaker corrected themselves",
        ],
      });
    });

    test("raw transcript 1", async () => {
      await runPostProcessingEval({
        transcription:
          "That's awesome. And adding some more details here that might be relevant when we were working our landscape in platform, one of the biggest pains that we saw across the industry is that or, like, biggest, not pains, but, like, one of the biggest things we observed is that all landscapers used different apps Like, someone used Sage, others used JobNobus, others used QuickBooks, others used, like, one off time tracking software. Like, everyone used a different piece of software. And after, you know, building our last product, I think the thing that we realized was that you should try to make us, like, a software that kinda integrates us with, like, all of these things rather than trying to define your own version of it. And so, like, if we build Voquill in this area, maybe we can like, use that studio.vocal.com idea or something. Basically, like, you you you know, you can talk to your computer and, like, he has an agent that's specific to his workflow. And then you can add photos and stuff. And it just, like, builds the report as you talk. That could be really interesting that he can just copy it over, basically, when he's done.",
        tone: getWritingStyle("default"),
        evals: ["it should clean up the transcript and it should make sense"],
      });
    });

    test("should fix self corrections 2", async () => {
      await runPostProcessingEval({
        transcription:
          "If I were to go over to the grocery store or actually no the electronics store. Do you want me to grab anything?",
        tone: getWritingStyle("default"),
        evals: ["It should mention electronics store but not grocery store"],
      });
    });

    test("example 1", async () => {
      await runPostProcessingEval({
        transcription:
          "Hey. I think that that implementation makes a lot of sense to me. I mean, yeah, I feel like we really need to think about, like, what we're giving our customers. Like, specifically, should we be giving them, like, more value or a cheaper product? Like, I don't I don't really know because we it's kind of like a one or the other at this point. What do you what do you what do you guys think?",
        tone: getWritingStyle("default"),
        evals: [
          "It should remove the choppy sentence structure. i.e. 'Hey. I think' -> Hey, I think",
        ],
      });
    });

    test("example 2", async () => {
      await runPostProcessingEval({
        transcription:
          "Yes. But you can't use examples. Remember, like, I core rule of this is you can't use examples and only worry about updating the tone dot utils dot t s. Because we're not doing the Dart files right now. Let's just do the tone utils.",
        tone: getWritingStyle("default"),
        evals: [
          "It should remove likes and ums and format the code names correctly",
        ],
      });
    });

    test("example 3", async () => {
      await runPostProcessingEval({
        transcription:
          "Yes. Thanks for bringing that up. I recently made a change to make it so verbatim doesn't apply any post processing, effects as part of its contract. And so with this change, I felt it appropriate to basically make it so, when you're doing real time with verbatim mode, it still doesn't apply post processing on the outputs since none is needed. This way, like, verbatim is basically, like, a through and through really clean very fast output with no post processing.",
        tone: getWritingStyle("default"),
        evals: [
          "It should remove filler words like 'like' while keeping the technical content intact",
        ],
      });
    });

    test("should deduplicate super redundant things", async () => {
      await runPostProcessingEval({
        transcription:
          "Hey Emily, can you go fix that thing? Excuse me, that speaker that you broke yesterday. I really need that. Actually uh, hey Emily, could you please go fix that speaker you broke? It's basically like a family heirloom and then you get a personal go find it and fix it. That would be great.",
        tone: getWritingStyle("default"),
        evals: [
          "It should apply the self correction, replacing 'thing' with 'speaker' and removing the earlier mention of 'thing'",
        ],
      });
    });

    test("should make sense", async () => {
      await runPostProcessingEval({
        transcription:
          "if i don't not sort of go to the beach, he should go there. but also maybe not",
        tone: getWritingStyle("default"),
        evals: [
          "It should clarify the meaning and intent of the speaker, even if the original transcription is confusing or contradictory",
        ],
      });
    });

    test("should polish", async () => {
      await runPostProcessingEval({
        transcription:
          "So without looking at my code, build like a you don't build anything. Just I'm building a Tauri app. Without looking at my code, what I want you to do is I want you to tell me how I should do hot keys because the way I I I need a way to, like, natively bind the hot keys that work in any application. So I need something that that works natively It used to work on Windows, Mac OS, and Linux. And so the idea is that I need to be able to bind a hockey to my app. Again, do not read my code on my app because I don't want you to know what I'm doing right now. How how would you wire that up? So, for example, I don't wanna press, like, function shift that could be a hotkey, or function z, that would be a hotkey. And if I press that, even though I press the z key, it type the character z into the computer. So, like, we want the hotkey itself to activate and not and and basically, like, register itself with the computer without actually, like, yeah.",
        tone: getWritingStyle("default"),
        evals: ["Should make it make more sense"],
      });
    });

    test("keeps colloquial tone", async () => {
      await runPostProcessingEval({
        transcription: "We need to develop phrasing that's like pretty good",
        tone: getWritingStyle("default"),
        evals: [
          "It should keep the 'pretty good' phrasing, even though it's grammatically incorrect but should remove the word 'like' since it's filler and doesn't add meaning",
        ],
      });
    });

    test("newline handling", async () => {
      await runPostProcessingEval({
        transcription:
          "Hey John um I wanted to check in about the project freefall newline newline are we still on track for the deadline next week",
        tone: getWritingStyle("default"),
        evals: [
          "It should convert 'newline' into an actual line break while keeping the content intact",
        ],
      });
    });

    test("should keep words that contribute to tone and style", async () => {
      await runPostProcessingEval({
        transcription:
          "dang, they beat us to the punchline. that's alright, we'll get them next time",
        tone: getWritingStyle("default"),
        evals: [
          "should keep the word dang in there",
          "should keep something like 'that is alright' and say we'll get them next time",
        ],
      });
    });

    test("basic transcription2", async () => {
      await runPostProcessingEval({
        transcription:
          "Hey douglas, I... uh.... wanted to check in about that the meeting tomorrow at 10am, no actually 4pm. Let me know if that still works for you.",
        tone: getWritingStyle("default"),
        evals: [
          "It should remove fill words and false starts",
          "It should auto correct the time to 4pm without mentioning 10am",
        ],
      });
    });

    test("basic transcription3", async () => {
      await runPostProcessingEval({
        transcription: `
So, um, I was thinking that we could, you know, maybe try to implement that new feature we discussed last week. Basically, it would involve creating a new API endpoint that, uh, allows users to fetch their data more efficiently. I mean, it's just an idea, but I think it could really improve the user experience.`,
        tone: getWritingStyle("default"),
        evals: [
          "It should remove some filler words and improve readability",
          "It should preserve all meaningful content",
        ],
      });
    });

    test("parens", async () => {
      await runPostProcessingEval({
        transcription: "open paren, that was dictated, close paren",
        tone: getWritingStyle("default"),
        evals: ["that was dictated should be in parentheses"],
      });
    });

    test("spanish transcription1", async () => {
      await runPostProcessingEval({
        transcription: `
Hola, me gustaría programar una reunión para discutir el proyecto la próxima semana. ¿Estás disponible el martes o el miércoles por la tarde? Por favor, avísame qué hora te conviene más.`,
        tone: getWritingStyle("default"),
        language: "es",
        evals: ["It should respond in Spanish"],
      });
    });

    test("simplified chinese transcription1", async () => {
      await runPostProcessingEval({
        transcription: `
大家好，我想安排一个会议来讨论下个月的市场营销活动。请告诉我你们的空闲时间，以便我们可以找到一个合适的时间。谢谢！`,
        tone: getWritingStyle("default"),
        language: "zh",
        evals: ["It should respond in SIMPLIFIED Chinese"],
      });
    });

    test("portuguese transcription1", async () => {
      await runPostProcessingEval({
        transcription: `
Olá, gostaria de agendar uma reunião para discutir o projeto na próxima semana. Você está disponível na terça ou quarta-feira à tarde? Por favor, me avise qual horário é mais conveniente para você.`,
        tone: getWritingStyle("default"),
        language: "pt",
        evals: ["It should respond in Portuguese"],
      });
    });

    test("translates transcription1", async () => {
      await runPostProcessingEval({
        transcription: `
Bonjour, je voudrais planifier une réunion pour discuter du projet la semaine prochaine. Êtes-vous disponible mardi ou mercredi après-midi? S'il vous plaît, faites-moi savoir quelle heure vous convient le mieux.`,
        tone: getWritingStyle("default"),
        language: "en", // translate to English
        evals: ["It should translate the text to English and keep meaning"],
      });
    });

    test("coding transcription1", async () => {
      await runPostProcessingEval({
        transcription: `
Hey, can you implement eval.utils.ts? Maybe inside of there, I'll also just create a method called getGentextRepo. For now, that's just going to return grok, but it should return the base repo as the interface. So let's do that first.`,
        tone: getWritingStyle("default"),
        evals: [
          "It should put backticks around coding terms like eval.utils.ts and getGentextRepo",
          "It should fix grammar and improve readability",
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
          "It should use a polite and empathetic tone.",
          "It should acknowledge the customer's concerns.",
          "It should maintain a professional demeanor throughout.",
          "It should end with a positive note, encouraging further contact.",
          "It should not make up any information.",
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
          "It should use an encouraging and positive tone.",
          "shouldn't have any negative language",
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
          "Should have a greeting addressing Sarah, a body, and a sign-off with Thomas's name",
          "Should sound casual and conversational, not stiff or corporate",
          "Should remove 'um' but keep all the actual content",
          "Should mention: design review, header looks great, tweak the colors",
        ],
      });
    });

    test("should not change who the subject is for emails", async () => {
      await runPostProcessingEval({
        transcription:
          "That's awesome. And adding some more details here that might be relevant when we were working our landscape in platform, one of the biggest pains that we saw across the industry is that or, like, biggest, not pains, but, like, one of the biggest things we observed is that all landscapers used different apps Like, someone used Sage, others used JobNobus, others used QuickBooks, others used, like, one off time tracking software. Like, everyone used a different piece of software. And after, you know, building our last product, I think the thing that we realized was that you should try to make us, like, a software that kinda integrates us with, like, all of these things rather than trying to define your own version of it. And so, like, if we build Voquill in this area, maybe we can like, use that studio.vocal.com idea or something. Basically, like, you you you know, you can talk to your computer and, like, he has an agent that's specific to his workflow. And then you can add photos and stuff. And it just, like, builds the report as you talk. That could be really interesting that he can just copy it over, basically, when he's done.",
        tone: getWritingStyle("email"),
        evals: [
          "It preserves the subject of the sentence as 'he' when referring to the user, rather than changing it to 'they' or 'you' or something else, since the speaker is talking about 'him'",
        ],
      });
    });

    test("example 2", async () => {
      await runPostProcessingEval({
        transcription:
          "Yes. But you can't use examples. Remember, like, I core rule of this is you can't use examples and only worry about updating the tone dot utils dot t s. Because we're not doing the Dart files right now. Let's just do the tone utils.",
        tone: getWritingStyle("email"),
        evals: [
          "It should not include a greeting and salutation since they didn't say one",
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
          "The greeting should use the speaker's words 'Hi team'",
          "The sign-off should use the speaker's words 'Best regards' with Thomas's name",
          "Body should mention thanks for hard work and keeping up momentum",
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
          "Should keep 'Dear Mr. Johnson' as the greeting since the speaker said it",
          "Should maintain a formal tone throughout — no casualization",
          "Should mention: quarterly report completed, ready for review, look forward to feedback",
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
          "The three items should be formatted as a bulleted or numbered list",
          "Should have a greeting with Mike's name",
          "All three items must be present: deployment Friday 3pm, update API docs, staging ready by Thursday",
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
          "Should use Wednesday as the deadline — Monday should not appear anywhere",
          "Should mention needing more time to review",
        ],
      });
    });

    test("preserves blunt language without softening", async () => {
      await runPostProcessingEval({
        transcription:
          "Hey team just a quick reminder that I'm going to be out tuesday... no wait Monday let me know if there's anything I can clear up before then because I don't want to be bothered and if there's anything you guys want to run by me before I leave just put it on my desk and I'll take a look at it thanks",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          "Should mention putting items on the desk for review",
          "Should say Monday, not Tuesday",
          "Should have greeting, body, and sign-off",
        ],
      });
    });

    test("does not fabricate details for vague content", async () => {
      await runPostProcessingEval({
        transcription:
          "uh hi I just wanted to let you know that I'll be out of office next week so if anything urgent comes up please reach out to Jessica, regards Thomas",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          "Should NOT add specific dates, a reason for absence, or Jessica's last name",
          "Should mention Jessica as the contact for urgent items",
          "Should say 'next week' without specifying exact days",
          "Should have greeting, body, and sign-off with Thomas's name",
        ],
      });
    });

    test("lazy vague email stays lazy and vague", async () => {
      await runPostProcessingEval({
        transcription:
          "Hey just wanted to say that the thing we talked about is important so yeah let's make sure we do that soon thanks, thomas",
        tone: getWritingStyle("email"),
        userName: "Thomas Gundan",
        evals: [
          "Should remove filler like 'so yeah' but keep the actual message",
          "Should have greeting, body, and sign-off with Thomas's name",
          "Should be short — this was a short message and the email should reflect that",
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
          "Should have a greeting with Bob's name",
          "Sign-off should use the name 'Emulator User'",
          "Should mention meeting yesterday and looking forward to next steps",
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
          "Should remove all filler words (um, so, like, uh, honestly, yeah) but keep the reasoning intact",
          "Should mention: move launch date back two weeks, QA hasn't started integration tests, marketing needs to finalize landing page, pushing to the 15th",
          "Should read as a clean email, not a wall of text — use paragraph breaks where it makes sense",
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
          "The question about budget should be clearly phrased as a question with a question mark",
          "Should mention: contractor hours, this quarter, help with migration, not going over budget",
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
          "Should preserve the enthusiasm — words like 'really well', 'super impressed', 'great position', 'nice work' should come through",
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
          "It should read like a casual text message, not a formal paragraph",
          "The core message (push release back a week due to bugs) should be preserved",
          "It should remove filler words like 'um', 'like', 'you know'",
        ],
      });
    });

    test("handles self-corrections", async () => {
      await runPostProcessingEval({
        transcription:
          "can you send that to me by Tuesday no wait Wednesday I have meetings all day Tuesday",
        tone: getWritingStyle("chat"),
        evals: [
          "It should use Wednesday, dropping the corrected Tuesday deadline",
          "It should read like a text message, not an email",
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
          "It should use formal language — no contractions like 'we're', no slang like 'gotta', 'totally screwed'",
          "The core message (deadline is Friday, consequences if missed) should be preserved",
          "It should read like professional correspondence",
        ],
      });
    });

    test("removes filler and disfluencies", async () => {
      await runPostProcessingEval({
        transcription:
          "so um I was thinking that like we could you know maybe revisit the budget for Q3 because uh the numbers don't really add up",
        tone: getWritingStyle("formal"),
        evals: [
          "It should remove all filler words like um, like, you know, uh",
          "It should use complete, well-structured sentences",
          "The meaning (revisit Q3 budget because numbers don't add up) should be preserved",
        ],
      });
    });

    test("handles self-corrections", async () => {
      await runPostProcessingEval({
        transcription:
          "the deadline is next Tuesday no wait Thursday we need the extra time",
        tone: getWritingStyle("formal"),
        evals: [
          "It should use Thursday as the deadline, dropping the corrected Tuesday mention",
          "It should be written in a formal, professional tone",
        ],
      });
    });

    test("suitable for official documents", async () => {
      await runPostProcessingEval({
        transcription:
          "alright so after looking at everything I think we should go with vendor B they've got better pricing and their support team is way more responsive than vendor A's",
        tone: getWritingStyle("formal"),
        evals: [
          "It should read like it belongs in a proposal or official recommendation — polished and professional",
          "Both reasons for choosing vendor B (better pricing, more responsive support) should be present",
          "It should not use casual words like 'alright', 'way more'",
        ],
      });
    });
  });
});
