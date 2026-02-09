import { expect, test, vi } from "vitest";
import { getDefaultSystemTones } from "../../src/utils/tone.utils";
import { postProcess } from "../helpers/eval.utils";

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

test(
  "stability1",
  async () => {
    for (let i = 0; i < 10; i++) {
      await expect(
        postProcess({
          tone: getWritingStyle("default"),
          transcription:
            "Hey, I need you to make it so on the settings page you see that manage subscription button. That should only show up if you're not on trial. Like, it should only show up if you're truly on the pro plan and not a trial. I think there's some utilities that you can use for that. Use your utilities, remember utilities, I believe. So yeah, that should only show up if you're on trial. If you're on trial, I still want to show up with an upgrade button, but I want it to be basically, let me say pay for pro. So you pay for pro, you come up with the vocabulary for that, but it's technically still on pro plan. What I want to do is basically, yeah, so if you're on pro plan, you're still on trial, so what I want it to do is you can click a button, and it should be in the header, and it should be on the settings page, replacing a manage subscription button. And what you should do is when you click on it, it should basically take you to the payment flow where you're going to convert to a real Pro account, you need to update this tribe services. Now come back. To accommodate this tribe service when you subscribe needs to says on trial to false and it only needs to mark your trial as it basically. You're effectively finishing your trial and converting to a real pro user. And yeah, so basically just like a way to get it out of a trial and convert over to a real pro user. That's the functionality we want. I need you to come up with a vocabulary for that.",
        }),
      ).resolves.not.toThrow();
    }
  },
  1000 * 60,
);
