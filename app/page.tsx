"use client";

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import PlansSection from "@/components/PlansSection";
import CoachesSection from "@/components/CoachesSection";
import EventsSection from "@/components/EventsSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <PlansSection />
        <CoachesSection />
        <EventsSection />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
