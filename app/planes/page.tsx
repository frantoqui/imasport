"use client";

import Navbar from "@/components/Navbar";
import PlansSection from "@/components/PlansSection";
import Footer from "@/components/Footer";

export default function PlanesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <PlansSection />
      </main>
      <Footer />
    </>
  );
}
