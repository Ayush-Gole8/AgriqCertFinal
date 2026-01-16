import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award, ShieldCheck, Leaf, ScanLine, Users, ArrowRight,
  CheckCircle2, Globe, QrCode, FileCheck, Truck, Sprout,
  Activity, ChevronRight, Sun, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { AppFooter } from "../components/layout/AppFooter";

// --- ANIMATION VARIANTS ---
const containerVar = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const itemVar = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } },
};

const floatVar = {
  animate: {
    y: [0, -10, 0],
    transition: { duration: 5, repeat: Infinity, ease: "easeInOut" }
  }
};

// --- SUB-COMPONENTS ---

const StepCard = ({ number, title, desc, icon: Icon }) => (
  <motion.div variants={itemVar} className="relative group pl-8 pb-12 border-l-2 border-primary/20 last:border-0 last:pb-0">
    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-background border-2 border-primary group-hover:bg-primary transition-colors duration-300" />
    <div className="flex items-start gap-4 -mt-2">
      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-lg font-semibold leading-none mb-2 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{desc}</p>
      </div>
    </div>
  </motion.div>
);

const PassportVisual = () => (
  <motion.div
    variants={floatVar}
    animate="animate"
    className="relative w-full max-w-sm mx-auto perspective-1000"
  >
    {/* Glow Effect */}
    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-2xl blur-2xl opacity-30" />

    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-xl p-6 shadow-2xl">
      {/* Decorative Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Leaf className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">AgriQCert</p>
            <p className="text-xs text-slate-400">Digital Product Passport</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-2 py-0.5">
          VERIFIED
        </Badge>
      </div>

      {/* Main Data */}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Product</p>
            <h4 className="text-lg font-medium text-slate-100">Premium Basmati Rice</h4>
            <p className="text-xs text-slate-400">Batch #EXP-2026-884</p>
          </div>
          <div className="bg-white p-1 rounded-md">
            <QrCode className="h-12 w-12 text-black" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/5 p-2">
            <p className="text-[10px] text-slate-500">Moisture</p>
            <p className="text-sm font-semibold text-emerald-400">11.2% <span className="text-[10px] text-emerald-600">PASSED</span></p>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <p className="text-[10px] text-slate-500">Pesticide</p>
            <p className="text-sm font-semibold text-emerald-400">0.02ppm <span className="text-[10px] text-emerald-600">SAFE</span></p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Signed by QA Labs India</span>
          <span>DID:Inji:847...</span>
        </div>
      </div>
    </div>

    {/* Floating Elements behind */}
    <motion.div
      animate={{ y: [10, -10, 10], rotate: [0, 5, 0] }}
      transition={{ duration: 7, repeat: Infinity }}
      className="absolute -right-8 -bottom-6 bg-amber-500/10 backdrop-blur-md border border-amber-500/20 p-3 rounded-lg z-10 w-40"
    >
      <div className="flex items-center gap-2 mb-1">
        <Activity className="h-3 w-3 text-amber-400" />
        <span className="text-[10px] text-amber-200 font-semibold">Real-time Check</span>
      </div>
      <div className="h-1 w-full bg-amber-900/50 rounded-full overflow-hidden">
        <div className="h-full w-[80%] bg-amber-500" />
      </div>
    </motion.div>
  </motion.div>
);

const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="hidden sm:flex items-center gap-2 pr-3 mr-1 border-r border-border/40">
      <Sun className="h-4 w-4 text-muted-foreground" />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
      <Moon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
};

const Navbar = () => {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-background/60 backdrop-blur-md supports-[backdrop-filter]:bg-background/40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg shadow-emerald-900/20">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-foreground">AgriQCert</p>
            <p className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">Global Trust Layer</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          {["Features", "Workflow", "Developers"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="transition-colors hover:text-emerald-500">
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex hover:bg-emerald-500/10 hover:text-emerald-600">
            <Link to="/verify">Verify Pass</Link>
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20" size="sm" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

const HeroSection = ({ primaryHref }: { primaryHref: string }) => (
  // CHANGED: reduced pt-32/lg:pt-48 to pt-24/lg:pt-36
  <section className="relative pt-24 pb-16 lg:pt-36 lg:pb-24 px-6">
    <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <motion.div variants={containerVar} initial="hidden" animate="show" className="space-y-6 lg:space-y-8">

        <motion.div variants={itemVar} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-600">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Inji Compliant Architecture
        </motion.div>

        <motion.div variants={itemVar} className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
            Trust is the currency of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
              Modern Agriculture
            </span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed">
            Connect farm, lab, and port in a single secure workflow. Issue W3C-verifiable credentials that clear customs instantly.
          </p>
        </motion.div>

        <motion.div variants={itemVar} className="flex flex-wrap gap-4">
          <Button size="lg" className="h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-base shadow-xl shadow-emerald-900/20" asChild>
            <Link to={primaryHref}>
              Start Exporting <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-11 px-8 rounded-full border-2 hover:bg-secondary/50 text-base" asChild>
            <Link to="/verify">
              <ScanLine className="mr-2 h-4 w-4" />
              Scan QR Code
            </Link>
          </Button>
        </motion.div>

        <motion.div variants={itemVar} className="pt-6 border-t border-border/50 grid grid-cols-3 gap-8">
          {[
            { label: "Traceability", val: "100%" },
            { label: "Countries", val: "24+" },
            { label: "Paperwork", val: "0%" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-foreground">{stat.val}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="relative hidden lg:block"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/30 to-amber-500/30 blur-[90px] -z-10" />
        <PassportVisual />
      </motion.div>
    </div>
  </section >
);

const WorkflowSection = () => (
  <section id="workflow" className="py-24 bg-secondary/30 relative">
    <div className="mx-auto max-w-5xl px-6">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">From Field to Fork</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Our horizontal ledger mirrors the physical movement of goods, adding a layer of cryptographic trust at every handover.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1">
          <div className="relative pl-4">
            <StepCard
              icon={Sprout}
              title="Registration & Harvest"
              desc="Exporters log crop details, geolocation, and harvest dates directly from the field."
              number={undefined}
            />
            <StepCard
              icon={FileCheck}
              title="Lab Inspection"
              desc="Accredited QA agencies upload moisture and residue reports. System auto-flags non-compliance."
              number={undefined}
            />
            <StepCard
              icon={Award}
              title="Credential Issuance"
              desc="A W3C Verifiable Credential is minted and stored in the exporter's Inji Wallet."
              number={undefined}
            />
            <StepCard
              icon={Globe}
              title="Global Verification"
              desc="Customs officers scan the QR code to verify origin and quality instantly."
              number={undefined}
            />
          </div>
        </div>

        <div className="order-1 md:order-2 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-1 shadow-2xl border border-white/10 rotate-1 hover:rotate-0 transition-transform duration-500">
          <div className="rounded-xl overflow-hidden bg-slate-950/50 h-full p-8 flex flex-col justify-center items-center text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-10 w-10 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Tamper-Proof Logic</h3>
              <p className="text-slate-400 text-sm mt-2">
                Unlike PDFs, AgriQCert credentials are signed digitally. Any modification breaks the seal.
              </p>
            </div>
            <div className="w-full bg-slate-900 rounded-lg p-4 border border-slate-800 text-left font-mono text-xs text-emerald-400 overflow-hidden">
              <p className="opacity-50">{"{"}</p>
              <p className="pl-4">"issuer": "did:Inji:qa-agency",</p>
              <p className="pl-4">"status": "verified",</p>
              <p className="pl-4">"integrity": "sha-256-hash..."</p>
              <p className="opacity-50">{"}"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const FeaturesSection = () => (
  <section id="features" className="py-24 px-6">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Built for the entire ecosystem</h2>
          <p className="text-muted-foreground">Tailored interfaces for every stakeholder in the chain.</p>
        </div>

        <Tabs defaultValue="exporter" className="w-full md:w-auto">
          <TabsList className="bg-secondary/50 p-1 border border-border/50">
            <TabsTrigger value="exporter">Exporters</TabsTrigger>
            <TabsTrigger value="agency">QA Agencies</TabsTrigger>
            <TabsTrigger value="customs">Customs</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {[
          {
            title: "Batch Management",
            desc: "Track every grain. Organize shipments by harvest season, destination, or quality grade.",
            color: "bg-blue-500/10 text-blue-500"
          },
          {
            title: "Offline-First",
            desc: "Field inspectors can log data without internet. Syncs automatically when back online.",
            color: "bg-amber-500/10 text-amber-500"
          },
          {
            title: "Instant Revocation",
            desc: "If a batch is recalled, the digital passport is flagged immediately across the network.",
            color: "bg-red-500/10 text-red-500"
          }
        ].map((card, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center mb-4`}>
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
            <p className="text-sm text-muted-foreground">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const FooterCtaSection = () => (
  <section className="py-20 px-6">
    <div className="mx-auto max-w-4xl relative overflow-hidden rounded-3xl bg-emerald-900 px-6 py-16 text-center shadow-2xl sm:px-16">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      <div className="absolute -top-24 -left-24 h-64 w-64 bg-emerald-500/30 blur-3xl rounded-full" />

      <div className="relative z-10 space-y-6">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to secure your supply chain?
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-emerald-100">
          Join the network of trusted exporters and agencies using AgriQCert to standardize global trade.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <Button size="lg" className="bg-white text-emerald-900 hover:bg-emerald-50" asChild>
            <Link to="/login">Get Started Now</Link>
          </Button>
          <Button size="lg" variant="outline" className="border-emerald-500/50 text-emerald-100 hover:bg-emerald-800 hover:text-white" asChild>
            <Link to="/developers">Read Documentation</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

// --- MAIN PAGE COMPONENT ---

const Index = () => {
  const { isAuthenticated } = useAuth();
  const primaryHref = isAuthenticated ? "/dashboard" : "/login";

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans bg-background text-foreground selection:bg-emerald-500/30">

      <div className="fixed inset-0 -z-10 bg-background">
        <div className="absolute top-0 -left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-0 -right-1/4 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
      </div>

      <Navbar />

      <main>
        <HeroSection primaryHref={primaryHref} />
        <WorkflowSection />
        <FeaturesSection />
        <FooterCtaSection />
      </main>

      <AppFooter />
    </div>
  );
};

export default Index;
