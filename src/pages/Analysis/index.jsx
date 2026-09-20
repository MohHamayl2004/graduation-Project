import { useEffect, useMemo, useState } from "react";
import { FileText, Sparkles, Check, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import Logo from "../../components/common/Logo";
import ProgressBar from "../../components/common/ProgressBar";

const steps = [
  { title: "تم استلام الملف", detail: "حفظنا الملف بنجاح في مكتبتك" },
  { title: "تقسيم المحتوى", detail: "بنقسّم الملف لأجزاء مترابطة عشان نفهمه بدقة" },
  { title: "بناء خريطة المعرفة", detail: "بنحوّل النص لخريطة معرفة منظّمة..." },
  { title: "ربط المعلومات", detail: "بنربط المحتوى مع منهاج التوجيهي" },
  { title: "إنشاء الدرس", detail: "بنجهّز شرحًا مناسبًا لمستواك" },
  { title: "إنشاء الاختبار", detail: "بنحضّر أسئلة عشان تقيس فهمك" }
];

function AnalysisHeader() {
  return <Navbar searchPlaceholder="ابحث في مكتبتك..." showAvatar compact maxWidth="max-w-[980px]" />;
}

function AnalysisFooter() {
  return <Footer compact maxWidth="max-w-[980px]" />;
}

export default function Analysis() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    if (canceled) return undefined;

    const id = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(id);
          return 100;
        }
        return prev + 1;
      });
    }, 120);

    return () => clearInterval(id);
  }, [canceled]);

  useEffect(() => {
    if (progress === 100 && !canceled) {
      const timeout = setTimeout(() => navigate("/dashboard"), 700);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [progress, canceled, navigate]);

  const activeIndex = useMemo(() => {
    if (progress >= 100) return steps.length - 1;
    return Math.min(steps.length - 1, Math.floor((progress / 100) * steps.length));
  }, [progress]);

  const estimatedSeconds = Math.max(0, Math.ceil((100 - progress) * 0.12));

  return (
    <div className="h-screen overflow-hidden bg-surface text-ink">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="uploadMaterial" />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AnalysisHeader />

          <main className="flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex h-full w-full max-w-[980px] items-center justify-center">
              <div className="flex w-full max-w-[760px] flex-col items-center gap-3">
                <Logo showWordmark={false} height={30} />

                <div className="mt-1 rounded-full bg-accent-tint px-4 py-1.5 text-sm text-accent">
                  <span className="inline-flex items-center gap-2">
                    <Sparkles size={14} /> جاري تحليل مادتك
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-sm text-ink">
                  <FileText size={16} className="text-primary" /> Chemistry_Chapter3.pdf
                </div>

                <div className="grid h-[150px] w-[150px] place-items-center rounded-full bg-primary-tint sm:h-[180px] sm:w-[180px] lg:h-[200px] lg:w-[200px]">
                  <div className="grid h-[84px] w-[84px] place-items-center rounded-full bg-primary sm:h-[98px] sm:w-[98px] lg:h-[110px] lg:w-[110px]">
                    <LoaderCircle size={36} className="animate-spin text-white" />
                  </div>
                </div>

                <div className="w-full max-w-[440px] rounded-lg border border-border bg-surface-raised px-4 py-3 shadow-sm">
                  <ul className="space-y-2.5">
                    {steps.map((step, index) => {
                      const done = index < activeIndex;
                      const active = index === activeIndex && progress < 100;
                      return (
                        <li key={step.title} className="flex gap-3">
                          <div
                            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                              done
                                ? "border-accent bg-accent text-white"
                                : active
                                  ? "border-primary bg-primary text-white"
                                  : "border-border bg-surface-alt text-ink-faint"
                            }`}
                          >
                            {done ? (
                              <Check size={12} />
                            ) : active ? (
                              <LoaderCircle size={12} className="animate-spin" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            )}
                          </div>
                          <div>
                            <p className={`text-sm leading-tight ${done || active ? "text-ink" : "text-ink-faint"} ${active ? "font-semibold text-primary" : ""}`}>
                              {step.title}
                            </p>
                            <p className={`text-xs leading-5 ${done || active ? "text-ink-muted" : "text-ink-faint"}`}>{step.detail}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="w-full max-w-[440px]">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-lg font-medium text-primary" dir="ltr">{progress}% <span dir="rtl">تم تحليله</span></p>
                    <p className="text-xs text-ink-muted">باقي تقريبًا {estimatedSeconds} ثانية</p>
                  </div>
                  <ProgressBar value={progress} />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCanceled(true);
                    navigate("/login");
                  }}
                  className="rounded-full border border-border-strong px-6 py-2 text-sm font-medium text-ink-muted transition-colors duration-base hover:bg-surface-alt"
                >
                  إلغاء التحليل
                </button>
              </div>
            </div>
          </main>

          <AnalysisFooter />
        </div>
      </div>
    </div>
  );
}
