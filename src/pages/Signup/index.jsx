import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus, FileUp, Sparkles, GraduationCap, ArrowRight, ChevronDown, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/common/Logo";
import Button from "../../components/common/Button";
import { signup } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

const STRENGTH_TONE = {
  weak: "bg-error",
  medium: "bg-warning",
  strong: "bg-accent"
};

export default function Signup() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { t } = useTranslation(["auth", "common"]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [schoolCode, setSchoolCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const errorId = useId();

  const steps = [
    { title: t("signup.stepCreateAccountTitle"), desc: t("signup.stepCreateAccountDesc"), icon: UserPlus },
    { title: t("signup.stepUploadTitle"), desc: t("signup.stepUploadDesc"), icon: FileUp },
    { title: t("signup.stepGenerateTitle"), desc: t("signup.stepGenerateDesc"), icon: Sparkles },
    { title: t("signup.stepStartTitle"), desc: t("signup.stepStartDesc"), icon: GraduationCap }
  ];

  const strength = useMemo(() => {
    if (password.length < 6) return "weak";
    if (password.length < 10) return "medium";
    return "strong";
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError(t("signup.errorRequired"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("signup.errorPasswordMismatch"));
      return;
    }

    if (!agreed) {
      setError(t("signup.errorMustAgree"));
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const response = await signup({ fullName, email, password, stream: "scientific", grade: "12", ...(schoolCode.trim() ? { schoolCode } : {}) });
      signIn(response);
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    "h-12 w-full rounded-md border border-border-strong bg-surface-raised px-4 text-base outline-none transition-colors duration-base focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[46%_54%]">
        <section className="relative hidden overflow-hidden bg-primary px-10 py-10 text-white lg:flex lg:flex-col lg:px-14 lg:py-12">
          <div className="absolute -end-20 -top-20 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -start-10 bottom-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

          <Logo variant="white" height={32} className="relative z-10" />

          <div className="relative z-10 mt-14 max-w-[500px]">
            <h1 className="font-display text-5xl font-semibold leading-[1.1]">{t("signup.heroTitle")}</h1>
            <p className="mt-5 text-lg leading-8 text-white/85">{t("signup.heroSubtitle")}</p>

            <div className="mt-10 space-y-6">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="relative flex gap-4">
                    {idx !== steps.length - 1 ? (
                      <span className="absolute start-[19px] top-11 h-8 w-px bg-white/25" />
                    ) : null}
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/30 bg-white/10">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-lg font-semibold leading-tight">{step.title}</p>
                      <p className="mt-0.5 text-sm text-white/75">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-auto rounded-xl border border-white/15 bg-white/5 p-4">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                <span className="h-8 w-8 rounded-full border-2 border-primary bg-accent" />
                <span className="h-8 w-8 rounded-full border-2 border-primary bg-white/70" />
                <span className="h-8 w-8 rounded-full border-2 border-primary bg-white/40" />
              </div>
              <p className="text-sm text-white/90">{t("signup.communityNote")}</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-[480px]">
            <div className="mb-8 flex items-center justify-start">
              <div className="lg:hidden">
                <Logo height={30} />
              </div>
            </div>

            <h2 className="font-display text-4xl font-semibold tracking-tight">{t("signup.title")}</h2>
            <p className="mt-2 text-base text-ink-muted">
              {t("signup.alreadyHaveAccount")}{" "}
              <button type="button" onClick={() => navigate("/login")} className="font-semibold text-primary hover:underline">
                {t("signup.logIn")}
              </button>
            </p>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-ink">
                  {t("signup.fullNameLabel")}
                </label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("signup.fullNamePlaceholder")}
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="signupEmail" className="mb-2 block text-sm font-medium text-ink">
                  {t("signup.emailLabel")}
                </label>
                <input
                  id="signupEmail"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("signup.emailPlaceholder")}
                  className={fieldClass}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="signupPassword" className="mb-2 block text-sm font-medium text-ink">
                    {t("signup.passwordLabel")}
                  </label>
                  <div className="relative">
                    <input
                      id="signupPassword"
                      type={showPassword ? "text" : "password"}
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("signup.passwordPlaceholder")}
                      className={`${fieldClass} pe-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute end-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:bg-surface-alt"
                      aria-label={showPassword ? t("login.hidePassword", { ns: "auth" }) : t("login.showPassword", { ns: "auth" })}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {password ? (
                    <>
                      <div className="mt-2 flex gap-1.5" aria-hidden="true">
                        <span className={`h-1.5 flex-1 rounded ${STRENGTH_TONE[strength]}`} />
                        <span
                          className={`h-1.5 flex-1 rounded ${
                            strength === "strong" || strength === "medium" ? STRENGTH_TONE[strength] : "bg-border-strong"
                          }`}
                        />
                        <span className={`h-1.5 flex-1 rounded ${strength === "strong" ? STRENGTH_TONE.strong : "bg-border-strong"}`} />
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        {t("signup.passwordStrength", { strength: t(`signup.strength${strength.charAt(0).toUpperCase()}${strength.slice(1)}`) })}
                      </p>
                    </>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-ink">
                    {t("signup.confirmPasswordLabel")}
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("signup.confirmPasswordPlaceholder")}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="stream" className="mb-2 block text-sm font-medium text-ink">
                  {t("signup.gradeStreamLabel")}
                </label>
                <div className="relative">
                  <select id="stream" className={`${fieldClass} appearance-none`}>
                    <option>{t("signup.gradeStreamOption")}</option>
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                </div>
              </div>

              <div>
                <label htmlFor="schoolCode" className="mb-2 block text-sm font-medium text-ink">{t("signup.schoolCodeLabel")}</label>
                <input id="schoolCode" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} placeholder="ENS-123" className={fieldClass} dir="ltr" />
              </div>

              <label className="flex items-start gap-3 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-border-strong text-primary focus:ring-primary/30"
                />
                <span>
                  {t("signup.agreePrefix")} <button type="button" className="text-primary hover:underline">{t("common:footer.termsOfService")}</button>{" "}
                  {t("signup.agreeAnd")} <button type="button" className="text-primary hover:underline">{t("common:footer.privacyPolicy")}</button>
                  {t("signup.agreeSuffix")}
                </span>
              </label>

              {error ? (
                <p id={errorId} role="alert" className="text-sm text-error">
                  {error}
                </p>
              ) : null}

              <Button type="submit" fullWidth size="lg" disabled={submitting}>
                {submitting ? t("signup.registrationInProgress") : t("signup.createAccountButton")} <ArrowRight size={18} className="rtl:-scale-x-100" />
              </Button>
            </form>

            <div className="my-7 flex items-center gap-4 text-ink-faint">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium tracking-wide">{t("common:actions.orSignUpWith")}</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="secondary" fullWidth size="lg" className="gap-3">
              <span className="text-xl font-semibold text-primary">G</span>
              {t("common:actions.continueWithGoogle")}
            </Button>

            <p className="mt-10 text-center text-sm text-ink-faint">{t("common:footer.copyright")}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
