import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  FileUp,
  PlayCircle,
  Target,
  TrendingUp,
  CheckCircle2,
  Globe,
  AtSign,
  Menu,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/common/Logo";
import Button from "../../components/common/Button";
import SchoolShowcase from "../../components/journey/SchoolShowcase";

const features = [
  {
    title: "ارفع مادتك",
    desc: "حوّل ملفاتك وملاحظاتك وصور كتبك إلى محتوى دراسي تفاعلي خلال لحظات.",
    icon: FileUp,
    tone: "bg-primary-tint text-primary"
  },
  {
    title: "اسأل نبراس",
    desc: "اسأل بأي وقت، ومعلّم نبراس الذكي بفهم سياق المنهاج وبشرحلك خطوة خطوة.",
    icon: Bot,
    tone: "bg-accent-tint text-accent"
  },
  {
    title: "الدروس الذكية",
    desc: "شروحات صوتية ونصية بتبسّط مفاهيم المنهاج الفلسطيني الصعبة.",
    icon: PlayCircle,
    tone: "bg-primary-tint text-primary"
  },
  {
    title: "اختبارات بتناسب مستواك",
    desc: "تدرّب على أسئلة بتتدرّج بالصعوبة وبتحاكي نمط امتحانات التوجيهي.",
    icon: BookOpen,
    tone: "bg-accent-tint text-accent"
  },
  {
    title: "متابعة التقدّم",
    desc: "شوف نقاط قوتك والمواضيع اللي بدها مراجعة بكل موادك.",
    icon: TrendingUp,
    tone: "bg-primary-tint text-primary"
  },
  {
    title: "الخطة الدراسية",
    desc: "جدول مرن بيتكيّف مع مواعيد امتحاناتك وسرعة تعلّمك.",
    icon: Target,
    tone: "bg-accent-tint text-accent"
  }
];

const navLinks = [
  { label: "المزايا", href: "#journey-after" },
  { label: "كيف بشتغل؟", href: "#how-it-works" },
  { label: "للطلبة", href: "#students" },
  { label: "الاشتراكات", href: "#subscriptions" }
];

export default function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollToSection = (event, href) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const section = document.getElementById(href.slice(1));
    if (!section) return;
    event.preventDefault();
    setMenuOpen(false);
    requestAnimationFrame(() => {
      section.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start"
      });
    });
  };

  return (
    <div className="app-min-screen bg-surface text-ink">
      <header className="sticky top-0 z-30 border-b border-border bg-surface-raised/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Logo height={28} />

          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-muted lg:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={(event) => scrollToSection(event, link.href)} className="hover:text-ink">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Button variant="outline" onClick={() => navigate("/login")}>
              تسجيل الدخول
            </Button>
            <Button onClick={() => navigate("/signup")}>
              ابدأ مجانًا <ArrowRight size={16} className="rtl:-scale-x-100" />
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={menuOpen}
            className="grid h-11 w-11 place-items-center rounded-md text-ink lg:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-border px-5 py-4 lg:hidden">
            <nav className="flex flex-col gap-1 text-sm font-medium text-ink-muted">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} onClick={(event) => scrollToSection(event, link.href)} className="rounded-md px-2 py-2.5 text-start hover:bg-surface-alt hover:text-ink">
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="outline" fullWidth onClick={() => navigate("/login")}>
                تسجيل الدخول
              </Button>
              <Button fullWidth onClick={() => navigate("/signup")}>
                ابدأ مجانًا <ArrowRight size={16} className="rtl:-scale-x-100" />
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <SchoolShowcase />

        <section id="journey-after" className="mx-auto w-full max-w-[1280px] scroll-mt-28 px-5 py-14 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-4xl font-semibold text-ink sm:text-5xl">
            كل اللي بتحتاجه عشان تتفوّق بالتوجيهي
          </h2>
          <p className="mx-auto mt-3 max-w-[680px] text-center text-lg text-ink-muted">
            أدوات متكاملة بتنظّم دراستك وبتساعدك ترفع مستواك خطوة خطوة.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-lg border border-border bg-surface-raised p-5 shadow-sm">
                  <div className={`grid h-11 w-11 place-items-center rounded-md ${feature.tone}`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-ink-muted">{feature.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-28 bg-surface-alt py-14">
          <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 lg:px-8">
            <h2 className="text-center font-display text-4xl font-semibold text-ink sm:text-5xl">
              من ملف دراسي لتجربة تعلّم كاملة بأربع خطوات
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["٠١", "ارفع"],
                ["٠٢", "نبراس بحلّل"],
                ["٠٣", "تعلّم"],
                ["٠٤", "تابع تقدّمك"]
              ].map(([n, t]) => (
                <div key={n} className="text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-primary bg-surface-raised text-xl font-semibold text-primary">
                    {n}
                  </div>
                  <p className="mt-4 text-xl font-semibold text-ink">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="students" className="mx-auto grid w-full max-w-[1280px] scroll-mt-28 gap-8 px-5 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-xl bg-gradient-to-br from-[#ece2d2] to-[#d7c4a4] p-6">
            <div className="h-[300px] rounded-lg bg-gradient-to-br from-primary via-[#3f5a99] to-accent sm:h-[360px]" />
          </div>
          <div>
            <h2 className="font-display text-4xl font-semibold text-ink sm:text-5xl">مصمّم لطلبة التوجيهي في فلسطين</h2>
            <ul className="mt-6 space-y-3 text-lg text-ink">
              {[
                "ادرس من البيت حتى لو كان الإنترنت محدود",
                "واجهة عربية واضحة وسهلة الاستخدام",
                "محتوى متوافق مع منهاج التوجيهي الفلسطيني",
                "تجربة سهلة للطلبة في جميع المناطق",
                "مزايا أساسية مجانية لتبلّش فورًا"
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="subscriptions" className="mx-auto w-full max-w-[1280px] scroll-mt-28 px-5 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-primary p-8 text-center text-white shadow-lg sm:p-10">
            <h2 className="font-display text-4xl font-semibold sm:text-5xl">
              ابدأ رحلتك الذكية بالتوجيهي اليوم
            </h2>
            <p className="mx-auto mt-4 max-w-[680px] text-lg text-white/85">
              تعلّم بطريقة أوضح وأنسب إلك. مستقبلك ببلّش مع نبراس.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-8 border-none bg-white text-primary hover:bg-white/90"
              onClick={() => navigate("/signup")}
            >
              إنشاء حساب مجاني <ArrowRight size={16} className="rtl:-scale-x-100" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-primary text-white">
        <div className="mx-auto w-full max-w-[1280px] px-5 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Logo variant="white" height={26} />
              <p className="mt-4 max-w-[360px] text-sm leading-7 text-white/75">
                رفيق تعليمي ذكي للطلبة في فلسطين، بيوفّر تعلّم واضح ومناسب لكل طالب.
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" aria-label="موقع نبراس" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/15">
                  <Globe size={15} />
                </button>
                <button type="button" aria-label="تواصل معنا" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/15">
                  <AtSign size={15} />
                </button>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold tracking-wide">المنتج</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                <li>المعلّم الذكي</li>
                <li>إنشاء الاختبارات</li>
                <li>الخطة الدراسية</li>
                <li>الدروس</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold tracking-wide">المصادر</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                <li>دليل الاستخدام</li>
                <li>مركز المساعدة</li>
                <li>مدوّنة الطلبة</li>
                <li>معلومات المنهاج</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold tracking-wide">قانوني</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                <li>سياسة الخصوصية</li>
                <li>شروط الاستخدام</li>
                <li>سياسة ملفات تعريف الارتباط</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/75">
            <p>&copy; 2024 نبراس للتعلّم الذكي. جميع الحقوق محفوظة.</p>
            <p>فلسطين / العربية</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
