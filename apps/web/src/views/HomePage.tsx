"use client";

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
import PageLayout from "../layouts/PageLayout";

function HomePage() {
  return (
    <PageLayout>
      <OrganizationJsonLd />
      <SoftwareAppJsonLd />
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
  );
}

export default HomePage;
