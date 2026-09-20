import { useMemo, useState } from "react";
import { ChevronRight, Sparkles, PlayCircle, Download, Brain, Circle, CircleDot, FileQuestion } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import ProgressBar from "../../components/common/ProgressBar";
import { lectureContent, lectureTopics } from "../../data/mockLectures";

const relatedTopics = ["الاتجاهات الدورية", "تركيب الذرة", "القواعد العضوية"];

export default function Lectures() {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState("مقدمة");

  const section = useMemo(() => lectureContent[selectedTopic], [selectedTopic]);

  return (
    <div className="h-screen bg-surface text-ink">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="lectures" />

        <div className="flex min-w-0 flex-1 flex-col border-e border-border">
          <Navbar searchPlaceholder="ابحث في الكيمياء..." showAvatar />

          <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <Card padding="lg">
              <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                <span>المواد التعليمية</span>
                <ChevronRight size={14} className="rtl:-scale-x-100" />
                <span>الكيمياء</span>
                <ChevronRight size={14} className="rtl:-scale-x-100" />
                <span>الفصل الثالث</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent-tint px-3 py-1 text-xs font-semibold tracking-wide text-accent">
                <Sparkles size={12} />
                منشأ بالذكاء الاصطناعي
              </div>
              <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                {selectedTopic === "مقدمة" ? "الروابط الكيميائية وبنية الجزيئات" : selectedTopic}
              </h1>
              <div className="mt-5 flex items-center gap-4">
                <ProgressBar value={35} className="flex-1" />
                <span className="shrink-0 text-lg font-semibold text-primary">مكتمل 35%</span>
              </div>
            </Card>

            <Card padding="lg" className="mt-5">
              <h2 className="font-display text-2xl font-semibold text-ink">محتويات الدرس</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {lectureTopics.map((topic) => {
                  const selected = selectedTopic === topic;
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setSelectedTopic(topic)}
                      aria-pressed={selected}
                      className={`flex min-h-11 items-center gap-2 rounded-md border px-4 py-3 text-start text-sm transition-colors duration-base ${
                        selected
                          ? "border-primary bg-primary-tint text-primary"
                          : "border-border bg-surface text-ink hover:bg-surface-alt"
                      }`}
                    >
                      {selected ? <CircleDot size={15} /> : <Circle size={13} />}
                      <span>{topic}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card padding="lg" className="mt-5">
              <h3 className="font-display text-2xl font-semibold text-primary">{section.title}</h3>
              <div className="mt-4 max-h-[340px] space-y-5 overflow-y-auto pe-3 text-base leading-8 text-ink">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </Card>
          </main>

          <Footer />
        </div>

        <aside className="hidden w-[300px] shrink-0 overflow-y-auto bg-surface-alt px-6 py-6 xl:block">
          <h4 className="text-xs font-semibold tracking-[0.14em] text-ink-muted">الإجراءات</h4>
          <div className="mt-4 space-y-3">
            <Button variant="accent" fullWidth className="bg-accent-tint text-accent hover:bg-accent hover:text-white" onClick={() => navigate("/ai-tutor")}>
              <Brain size={18} /> اسأل المعلّم الذكي
            </Button>
            <Button variant="outline" fullWidth>
              <FileQuestion size={18} /> إنشاء اختبار
            </Button>
            <Button variant="secondary" fullWidth>
              <Download size={18} /> تنزيل الدرس
            </Button>
          </div>

          <div className="mt-6 rounded-lg border border-warning/30 bg-warning-tint p-4">
            <p className="text-base font-semibold text-warning">مواضيع بدها مراجعة</p>
            <p className="mt-2 text-sm text-ink">لاحظ نبراس إنك بتحتاج تراجع:</p>
            <p className="mt-1 text-sm font-semibold text-warning">الروابط التساهمية ومشاركة الإلكترونات</p>
            <Button variant="primary" size="sm" fullWidth className="mt-3 bg-warning hover:bg-warning/90">
              تدريب علاجي سريع
            </Button>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted">مواضيع مرتبطة</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {relatedTopics.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-full border border-border bg-surface-raised px-4 py-2 text-sm text-ink transition-colors duration-base hover:bg-surface-alt"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 rounded-lg bg-primary p-5 text-white">
            <p className="font-display text-lg font-semibold">الدور الجاي</p>
            <p className="mt-2 text-sm leading-7 text-white/85">
              حسب تقدّمك، بنصحك تجرّب محاكاة مختبر نظرية تنافر أزواج الإلكترونات.
            </p>
            <Button variant="secondary" fullWidth size="sm" className="mt-4 border-none bg-white text-primary hover:bg-white/90">
              <PlayCircle size={16} /> ابدأ المحاكاة
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
