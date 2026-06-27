import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import StatsBar from "@/components/StatsBar";
import HowItWorks from "@/components/HowItWorks";
import StepFlow from "@/components/StepFlow";
import Features from "@/components/Features";
import SocialProof from "@/components/SocialProof";
import Demo from "@/components/Demo";
import Safety from "@/components/Safety";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Marquee />       {/* A: feature ticker — compact bridge */}
        <StatsBar />      {/* animated count-up numbers */}
        <HowItWorks />
        <StepFlow />      {/* C: step pills — visual reinforcement after how-it-works */}
        <Features />      {/* with cursor spotlight */}
        <SocialProof />   {/* B: social proof — validate before demo */}
        <Demo />
        <Safety />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
