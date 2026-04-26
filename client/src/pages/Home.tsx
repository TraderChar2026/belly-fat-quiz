import React, { useState, useCallback, useEffect } from "react";
import { useAttribution } from "@/hooks/useAttribution";
import { QUESTIONS, CATEGORY_META, getAlertLevel, computeScores } from "../../../shared/quizData";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Leaf } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type QuizStage = "intro" | "questions" | "contact" | "results";

interface Answer {
  questionId: number;
  points: number;
  optionIndex: number;
}

interface ResultData {
  totalScore: number;
  digestiveScore: number;
  appetiteScore: number;
  gutScore: number;
  crmTag: string | null;
}

// ── Landing Page Header (shown only on intro stage) ───────────────────────────

function LandingHeader({ onStart }: { onStart: () => void }) {
  return (
    <div className="w-full">
      {/* Attention bar */}
      <div className="w-full bg-[#c8d8b8] py-3 px-4 text-center">
        <p className="text-sm md:text-base font-medium text-[#2d4a1e]">
          Attention Women 40+ Who Are Struggling Trying to Lose Stubborn Belly Fat
        </p>
      </div>

      {/* Headline section */}
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-6 text-center">
        <p className="text-lg md:text-xl text-foreground/80 mb-3 italic">
          It's Not Your Fault... It's Not Willpower...
        </p>

        <h1
          className="text-4xl md:text-6xl font-extrabold leading-tight mb-6"
          style={{ color: "#2b2fa8", fontFamily: "'Playfair Display', serif" }}
        >
          Take The Free Stubborn<br />Belly Fat Quiz
        </h1>

        <p className="text-xl md:text-2xl font-semibold text-foreground/85 leading-snug mb-2">
          Discover Why You Can't Lose The Fat No Matter What You Try
        </p>
        <p className="text-xl md:text-2xl font-semibold text-foreground/85 leading-snug mb-10">
          And How To Finally Lose Up To 25 Pounds In 12 Weeks
        </p>

        {/* Copy block */}
        <div className="max-w-xl mx-auto text-left mb-10 space-y-4 text-base md:text-lg text-foreground/80">
          <p className="text-center font-semibold text-foreground/70 mb-2">Let's End The Weight Loss Struggle.</p>
          <p>You're not at fault.<br />It's not willpower.<br />It's not your hormones.<br />It's not your age.</p>
          <p>Take this quiz to...</p>
          <ul className="list-none space-y-2">
            <li>✓ Discover the real reason you're struggling to lose weight after 40</li>
            <li>✓ Find out if your gut is secretly sabotaging your metabolism</li>
            <li>✓ Get your personalized risk score and what it means for you</li>
            <li>✓ Learn what to do next to finally get results</li>
          </ul>
        </div>

        <Button
          onClick={onStart}
          size="lg"
          className="px-12 py-6 text-lg font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
        >
          Start the Quiz Now →
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">Takes ~2 minutes · Your answers are private and never shared.</p>
      </div>

      {/* Divider before embedded quiz */}
      <div className="max-w-3xl mx-auto px-4 pb-4">
        <hr className="border-border/40" />
      </div>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Question {current} of {total}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    digestive: "Digestive Comfort",
    appetite: "Appetite & Metabolism",
    gut: "Gut Health",
  };
  return (
    <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary/70 mb-3">
      {labels[category] ?? category}
    </span>
  );
}

function QuestionPage({
  questionIndex,
  answers,
  onAnswer,
  onNext,
  onBack,
}: {
  questionIndex: number;
  answers: Answer[];
  onAnswer: (questionId: number, points: number, optionIndex: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const question = QUESTIONS[questionIndex];
  if (!question) return null;

  const currentAnswer = answers.find((a) => a.questionId === question.id);
  const isFirst = questionIndex === 0;
  const isLast = questionIndex === QUESTIONS.length - 1;

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <ProgressBar current={questionIndex + 1} total={QUESTIONS.length} />

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-7 md:p-10">
        <CategoryBadge category={question.category} />

        <h2
          className="text-2xl md:text-3xl font-semibold text-foreground leading-snug mb-8"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {question.text}
        </h2>

        <div className="flex flex-col gap-3">
          {question.options.map((option, idx) => {
            const isSelected = currentAnswer?.optionIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => onAnswer(question.id, option.points, idx)}
                className={[
                  "w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200",
                  "text-base leading-snug font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-primary/[0.07] text-foreground shadow-sm"
                    : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-accent/40",
                ].join(" ")}
              >
                <span className="flex items-start gap-3">
                  <span
                    className={[
                      "mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      isSelected ? "border-primary bg-primary" : "border-border",
                    ].join(" ")}
                  >
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                  <span>{option.text}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between mt-8 pt-6 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isFirst}
            className="gap-1.5 text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>

          <Button
            onClick={onNext}
            disabled={!currentAnswer}
            className="gap-1.5 px-7"
          >
            {isLast ? "Continue to Results" : "Next"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ContactForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (data: { fullName: string; email: string; phone?: string }) => void;
  isSubmitting: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    onSubmit({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() || undefined });
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4">
      <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-7 md:p-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-7 h-7 text-primary" />
          </div>
          <h2
            className="text-2xl md:text-3xl font-semibold text-foreground mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            You're almost there!
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            Enter your details below to see your personalized results and receive a free PDF explaining what they mean.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName" className="text-sm font-medium">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Jane Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground">
              Phone Number <span className="text-muted-foreground/60 font-normal">(optional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || !fullName.trim() || !email.trim()}
            className="mt-2 h-12 rounded-xl text-base font-semibold"
          >
            {isSubmitting ? "Submitting…" : "See My Results →"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          We respect your privacy. Your information is never sold or shared.
        </p>
      </div>
    </div>
  );
}

function ResultsPage({ result, answers, attribution }: { result: ResultData; answers: Answer[]; attribution: import("@/hooks/useAttribution").AttributionData }) {
  const alertLevel = getAlertLevel(result.totalScore);

  // ── Red Alert sub-group: Lower (23–30) vs Upper (31–54) ───────────────────
  const redAlertSubGroup: "lower" | "upper" | null =
    alertLevel === "red"
      ? result.totalScore <= 30
        ? "lower"
        : "upper"
      : null;

  // ── Auto-redirect countdown for yellow/red alert ───────────────────────────
  const buildVslUrl = (base: string) => {
    const p = new URLSearchParams();
    if (attribution.sessionId) p.set("sid", attribution.sessionId);
    p.set("tier", alertLevel);
    if (redAlertSubGroup) p.set("band", redAlertSubGroup);
    if (attribution.adNameRaw) p.set("ad_name", attribution.adNameRaw);
    if (attribution.utmSource) p.set("utm_source", attribution.utmSource);
    if (attribution.utmMedium) p.set("utm_medium", attribution.utmMedium);
    if (attribution.utmCampaign) p.set("utm_campaign", attribution.utmCampaign);
    if (attribution.utmId) p.set("utm_id", attribution.utmId);
    if (attribution.fbclid) p.set("fbclid", attribution.fbclid);
    return `${base}?${p.toString()}`;
  };
  const redirectUrl =
    alertLevel === "yellow"
      ? buildVslUrl("/yellow-alert-preview.html")
      : alertLevel === "red"
      ? buildVslUrl("/red-alert-preview.html")
      : null;

  const [countdown, setCountdown] = useState(redirectUrl ? 7 : 0);

  useEffect(() => {
    if (!redirectUrl) return;
    if (countdown <= 0) {
      window.location.href = redirectUrl;
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, redirectUrl]);

  const alertConfig = {
    green: {
      label: "Green Alert",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
      message:
        "Your gut health indicators look relatively strong. Maintaining your current habits and staying proactive will keep you on the right track.",
    },
    yellow: {
      label: "Yellow Alert",
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      dot: "bg-amber-400",
      message:
        "Your results suggest moderate gut health disruption that may be contributing to stubborn belly fat. There are clear, actionable steps you can take to improve.",
    },
    red: {
      label: alertLevel === "red" && redAlertSubGroup === "lower" ? "Red Alert" : "Red Alert",
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      dot: "bg-red-500",
      message:
        redAlertSubGroup === "lower"
          ? // ── PLACEHOLDER: Lower Red Alert message (score 23–30) ──────────────
            // TODO: Replace with personalized message for lower Red Alert group
            "Your results indicate significant gut health disruption. This level of imbalance is strongly linked to stubborn belly fat and metabolic resistance — but it is reversible."
          : redAlertSubGroup === "upper"
          ? // ── PLACEHOLDER: Upper Red Alert message (score 31–54) ──────────────
            // TODO: Replace with personalized message for upper Red Alert group
            "Your results indicate significant gut health disruption. This level of imbalance is strongly linked to stubborn belly fat and metabolic resistance — but it is reversible."
          : "Your results indicate significant gut health disruption. This level of imbalance is strongly linked to stubborn belly fat and metabolic resistance — but it is reversible.",
    },
  }[alertLevel];

  const categories = [
    { key: "digestive", score: result.digestiveScore, max: CATEGORY_META.digestive.maxScore, label: CATEGORY_META.digestive.label },
    { key: "appetite", score: result.appetiteScore, max: CATEGORY_META.appetite.maxScore, label: CATEGORY_META.appetite.label },
    { key: "gut", score: result.gutScore, max: CATEGORY_META.gut.maxScore, label: CATEGORY_META.gut.label },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">

      {/* Countdown redirect banner — only for yellow/red */}
      {redirectUrl && (
        <div className="mb-6 rounded-xl bg-[#c8d8b8] border border-[#4a7c59] px-5 py-4 text-center">
          <p className="text-sm font-semibold text-[#2d4a1e]">
            📺 Char has a personal message for you based on your results.
            {redAlertSubGroup && (
              <span className="ml-1 text-xs font-normal opacity-70">
                ({redAlertSubGroup === "lower" ? "Score 23–30" : "Score 31–54"})
              </span>
            )}
          </p>
          <p className="text-sm text-[#2d4a1e] mt-1">
            Redirecting you in <span className="font-bold text-lg">{countdown}</span> second{countdown !== 1 ? "s" : ""}...
          </p>
          <a
            href={redirectUrl}
            className="inline-block mt-3 text-sm font-bold text-[#2d4a1e] underline underline-offset-2"
          >
            Click here to watch now →
          </a>
        </div>
      )}

      <div className="text-center mb-8">
        <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
          Your Results
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-foreground mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Stubborn Belly Fat Quiz Results
        </h1>
      </div>

      {/* Score + Alert card */}
      <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-7 md:p-10 mb-5">
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          {/* Big score */}
          <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground mb-1">Total Score</p>
            <p
              className="text-6xl font-bold text-foreground leading-none"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {result.totalScore}
            </p>
            <p className="text-sm text-muted-foreground mt-1">out of 51</p>
          </div>

          <div className="hidden sm:block w-px h-16 bg-border" />

          {/* Alert badge */}
          <div className={`flex-1 rounded-xl px-5 py-4 border ${alertConfig.bg} ${alertConfig.border}`}>
            <div className="flex items-center gap-2.5 mb-2">
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${alertConfig.dot}`} />
              <span className={`text-base font-semibold ${alertConfig.color}`}>
                {alertConfig.label}
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${alertConfig.color} opacity-90`}>
              {alertConfig.message}
            </p>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="border-t border-border/50 pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Score Breakdown
          </p>
          <div className="flex flex-col gap-4">
            {categories.map((cat) => {
              const pct = Math.round((cat.score / cat.max) * 100);
              return (
                <div key={cat.key}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-foreground">{cat.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {cat.score} / {cat.max} pts
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA card */}
      <div className="bg-primary/[0.06] rounded-2xl border border-primary/20 p-7 md:p-8 text-center">
        <AlertCircle className="w-8 h-8 text-primary mx-auto mb-4" />
        <h3
          className="text-xl font-semibold text-foreground mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Want to Know What Your Results Mean?
        </h3>
        <p className="text-base text-muted-foreground leading-relaxed mb-2">
          Check your email and learn how I lost 50 stubborn pounds.
        </p>
        <p className="text-sm text-muted-foreground">
          I've sent you an email with a link to a PDF that explains your results.
        </p>
      </div>
    </div>
  );
}

// ── Main Quiz Component ────────────────────────────────────────────────────────

export default function Home() {
  const [stage, setStage] = useState<QuizStage>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<ResultData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswer = useCallback(
    (questionId: number, points: number, optionIndex: number) => {
      setAnswers((prev) => {
        const filtered = prev.filter((a) => a.questionId !== questionId);
        return [...filtered, { questionId, points, optionIndex }];
      });
    },
    []
  );

  const handleNext = useCallback(() => {
    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      setStage("contact");
    }
  }, [questionIndex]);

  const handleBack = useCallback(() => {
    if (questionIndex > 0) {
      setQuestionIndex((i) => i - 1);
    } else {
      setStage("intro");
    }
  }, [questionIndex]);

  const attribution = useAttribution();
  const trackEvent = trpc.funnel.track.useMutation();

  // Fire page_view on mount
  useEffect(() => {
    if (attribution.sessionId) {
      trackEvent.mutate({
        eventType: "page_view",
        sessionId: attribution.sessionId,
        adName: attribution.adNameRaw,
        referrerPlatform: attribution.referrerPlatform,
        utmSource: attribution.utmSource,
        utmCampaign: attribution.utmCampaign,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attribution.sessionId]);

  const handleContactSubmit = useCallback(
    async (contactData: { fullName: string; email: string; phone?: string }) => {
      setIsSubmitting(true);
      try {
        const payload = {
          ...contactData,
          answers: answers.map(({ questionId, points, optionIndex }) => ({ questionId, points, optionIndex })),
          // Attribution data
          sessionId: attribution.sessionId,
          timezone: attribution.timezone,
          adName: attribution.adNameRaw, // normalized server-side
          adNameRaw: attribution.adNameRaw,
          referrerUrl: attribution.referrerUrl,
          referrerPlatform: attribution.referrerPlatform,
          utmSource: attribution.utmSource,
          utmMedium: attribution.utmMedium,
          utmCampaign: attribution.utmCampaign,
          utmId: attribution.utmId,
          utmTerm: attribution.utmTerm,
          fbclid: attribution.fbclid,
          fbEventId: attribution.fbEventId,
          pageUrl: attribution.pageUrl,
        };

        const res = await fetch("/api/ghl-submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Submission failed");

        const data = await res.json();
        // Fire quiz_complete funnel event
        if (attribution.sessionId) {
          trackEvent.mutate({
            eventType: "quiz_complete",
            sessionId: attribution.sessionId,
            email: contactData.email,
            alertTier: data.crmTag?.includes("red") ? "Red" : data.crmTag?.includes("yellow") ? "Yellow" : "Green",
            adName: attribution.adNameRaw,
            referrerPlatform: attribution.referrerPlatform,
            utmSource: attribution.utmSource,
            utmCampaign: attribution.utmCampaign,
          });
        }
        setResult({
          totalScore: data.totalScore,
          digestiveScore: data.digestiveScore,
          appetiteScore: data.appetiteScore,
          gutScore: data.gutScore,
          crmTag: data.crmTag,
        });
        setStage("results");
      } catch {
        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [answers]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Slim sticky nav — only shown during quiz flow (not on intro) */}
      {stage !== "intro" && (
        <header className="w-full border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Leaf className="w-5 h-5 text-primary" />
              <span
                className="text-base font-semibold text-foreground"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Stubborn Belly Fat Quiz
              </span>
            </div>
            {stage === "questions" && (
              <span className="text-xs text-muted-foreground">
                {answers.length} / {QUESTIONS.length} answered
              </span>
            )}
          </div>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center py-10 px-2">
        {stage === "intro" && <LandingHeader onStart={() => {
          setStage("questions");
          if (attribution.sessionId) {
            trackEvent.mutate({
              eventType: "quiz_start",
              sessionId: attribution.sessionId,
              adName: attribution.adNameRaw,
              referrerPlatform: attribution.referrerPlatform,
              utmSource: attribution.utmSource,
              utmCampaign: attribution.utmCampaign,
            });
          }
        }} />}

        {stage === "questions" && (
          <QuestionPage
            questionIndex={questionIndex}
            answers={answers}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {stage === "contact" && (
          <ContactForm onSubmit={handleContactSubmit} isSubmitting={isSubmitting} />
        )}

        {stage === "results" && result && (
          <ResultsPage result={result} answers={answers} attribution={attribution} />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-5 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Stubborn Belly Fat Quiz · All rights reserved
        </p>
      </footer>
    </div>
  );
}
