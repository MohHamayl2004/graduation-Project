import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/common/Logo";
import Button from "../../components/common/Button";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation(["auth", "common"]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const errorId = useId();

  const highlights = [t("login.highlight1"), t("login.highlight2"), t("login.highlight3")];

  const handleSubmit = (e) => {
    e.preventDefault();

    if (email === "NIPRAS" && password === "123") {
      setError("");
      navigate("/analysis");
      return;
    }

    setError(t("login.errorInvalid"));
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[46%_54%]">
        <section className="relative hidden overflow-hidden bg-primary px-10 py-10 text-white lg:flex lg:flex-col lg:px-14 lg:py-12">
          <div className="absolute -end-24 -top-24 h-[480px] w-[480px] rounded-full border border-white/10" />
          <div className="absolute -start-16 bottom-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

          <Logo variant="white" height={32} className="relative z-10" />

          <div className="relative z-10 mt-14 max-w-[500px]">
            <h1 className="font-display text-5xl font-semibold leading-[1.1]">{t("login.welcomeBack")}</h1>
            <p className="mt-5 text-lg leading-8 text-white/85">{t("login.heroSubtitle")}</p>
            <ul className="mt-8 space-y-4 text-base">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent">
                    <Check size={15} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mt-auto max-w-[520px] rounded-xl border border-white/15 bg-white/5 p-5">
            <p className="font-display text-lg font-semibold">{t("login.aiQuoteLabel")}</p>
            <p className="mt-1.5 text-[15px] leading-7 text-white/80">&ldquo;{t("login.aiQuoteText")}&rdquo;</p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-[440px]">
            <div className="mb-8 flex items-center justify-start">
              <div className="lg:hidden">
                <Logo height={30} />
              </div>
            </div>

            <h2 className="font-display text-4xl font-semibold tracking-tight">{t("login.signInTitle")}</h2>
            <p className="mt-2 text-base leading-7 text-ink-muted">{t("login.signInSubtitle")}</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">
                  {t("login.emailLabel")}
                </label>
                <input
                  id="email"
                  type="text"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("login.emailPlaceholder")}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  className="h-12 w-full rounded-md border border-border-strong bg-surface-raised px-4 text-base outline-none transition-colors duration-base focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-ink">
                    {t("login.passwordLabel")}
                  </label>
                  <button type="button" className="text-sm font-medium text-primary hover:underline">
                    {t("login.forgotPassword")}
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("login.passwordPlaceholder")}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="h-12 w-full rounded-md border border-border-strong bg-surface-raised px-4 pe-12 text-base outline-none transition-colors duration-base focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute end-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:bg-surface-alt"
                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {error ? (
                <p id={errorId} role="alert" className="text-sm text-error">
                  {error}
                </p>
              ) : null}

              <Button type="submit" fullWidth size="lg">
                {t("login.signInButton")} <ArrowRight size={18} className="rtl:-scale-x-100" />
              </Button>
            </form>

            <div className="my-7 flex items-center gap-4 text-ink-faint">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium tracking-wide">{t("common:actions.orContinueWith")}</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="secondary" fullWidth size="lg" className="gap-3">
              <span className="text-xl font-semibold text-primary">G</span>
              {t("common:actions.continueWithGoogle")}
            </Button>

            <p className="mt-7 text-center text-sm text-ink-muted">
              {t("login.noAccount")}{" "}
              <button type="button" onClick={() => navigate("/signup")} className="font-semibold text-primary hover:underline">
                {t("login.createOne")}
              </button>
            </p>

            <div className="mt-16 text-center text-ink-faint">
              <p className="text-sm">{t("common:footer.copyright")}</p>
              <div className="mt-2 flex items-center justify-center gap-6 text-sm">
                <button type="button" className="hover:text-ink-muted">{t("common:footer.privacyPolicy")}</button>
                <button type="button" className="hover:text-ink-muted">{t("common:footer.termsOfService")}</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
