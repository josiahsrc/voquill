import { AppsCarousel } from "../components/apps-carousel";
import DiscordSection from "../components/discord-section";
import { HeroSection } from "../components/hero";
import OfflineShowcase from "../components/offline-showcase";
import PricingSection from "../components/pricing-section";
import PrivacyShowcase from "../components/privacy-showcase";
import SpeedShowcase from "../components/speed-showcase";
import {
  OrganizationJsonLd,
  SoftwareAppJsonLd,
} from "../components/structured-data";
import TextCleanupShowcase from "../components/text-cleanup-showcase";
import VideoSection from "../components/video-section";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";

function HomePage() {
  return (
    <BaseLayout>
      <PageLayout>
        <OrganizationJsonLd />
        <SoftwareAppJsonLd
          name="Voquill"
          description="Type four times faster with a voice-first keyboard. Open-source speech-to-text that runs locally on your device."
          url="https://voquill.com"
          operatingSystem="macOS, Windows, Linux"
          category="ProductivityApplication"
        />
        <HeroSection />
        <VideoSection />
        <AppsCarousel />
        <SpeedShowcase />
        <PrivacyShowcase />
        <TextCleanupShowcase />
        <OfflineShowcase />
        <PricingSection />
        <DiscordSection />
      </PageLayout>
    </BaseLayout>
  );
}

export default HomePage;
