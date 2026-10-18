import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus, FileUp, Sparkles, GraduationCap, ArrowRight, ChevronDown, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/common/Logo";
import Button from "../../components/common/Button";
import SubscriptionPlanPicker from "../../components/common/SubscriptionPlanPicker";
import { signup } from "../../services/authService";
import { academicStreams } from "../../../shared/academicStreams";
import { useAuth } from "../../context/AuthContext";
import { palestinianCities } from "../../../shared/subscriptions";
import { signupFieldErrors } from "../../../shared/signupFields";

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
  const [birthDate, setBirthDate] = useState("");
  const [stream, setStream] = useState("");
  const [city, setCity] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState({});
  const errorId = useId();
  const values = { fullName, email, password, confirmPassword, birthDate, stream, schoolCode, city, agreed };
  const validationErrors = signupFieldErrors(values);
  const fieldErrors = { ...(hasSubmitted ? validationErrors : {}), ...serverFieldErrors };
  const fieldIds = { fullName: "fullName", email: "signupEmail", password: "signupPassword", confirmPassword: "confirmPassword", birthDate: "birthDate", stream: "stream", schoolCode: "schoolCode", city: "signupCity", agreed: "signupAgreed" };
  const fieldProps = (name) => ({ "aria-invalid": Boolean(fieldErrors[name]), "aria-describedby": fieldErrors[name] ? `${errorId}-${name}` : undefined });
  const fieldError = (name) => <div className={`mb-2 flex items-end ${name === "password" || name === "confirmPassword" ? "h-[60px]" : "h-10"}`}><p id={`${errorId}-${name}`} className="text-sm font-medium leading-5 text-error" aria-hidden={!fieldErrors[name]}>{fieldErrors[name] || "\u00a0"}</p></div>;
  const changePassword = (event, name, setter) => {
    const raw = event.target.value;
    const filtered = raw.replace(/[^\x21-\x7E]/g, "");
    setter(filtered);
    if (raw !== filtered) setServerFieldErrors((previous) => ({ ...previous, [name]: "استخدم أحرفًا إنجليزية وأرقامًا ورموزًا فقط، بدون مسافات أو حروف عربية" }));
  };
  const focusField = (name) => requestAnimationFrame(() => {
    const element = document.getElementById(fieldIds[name]);
    element?.focus({ preventScroll: true });
    element?.closest("[data-signup-field]")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
  });

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

    setHasSubmitted(true);
    setError("");
    setServerFieldErrors({});
    const firstError = Object.keys(validationErrors)[0];
    if (firstError) {
      focusField(firstError);
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const response = await signup({ fullName, email, password, birthDate, stream, city, subscriptionTier, ...(schoolCode.trim() ? { schoolCode } : {}) });
      signIn(response);
      navigate(subscriptionTier === "free" ? "/dashboard" : "/subscription");
    } catch (requestError) {
      const fieldName = requestError.code === "EMAIL_ALREADY_EXISTS" ? "email" : requestError.code === "INVALID_SCHOOL_CODE" ? "schoolCode" : requestError.code === "INVALID_PASSWORD_FORMAT" ? "password" : null;
      if (fieldName) { setServerFieldErrors({ [fieldName]: requestError.message }); focusField(fieldName); }
      else setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    "h-12 w-full rounded-md border border-border-strong bg-surface-raised px-4 text-base outline-none transition-colors duration-base focus:border-primary focus:ring-2 focus:ring-primary/15 aria-[invalid=true]:border-error aria-[invalid=true]:bg-error-tint/30 aria-[invalid=true]:focus:border-error aria-[invalid=true]:focus:ring-error/15";

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

            <form className="mt-7 space-y-4" onSubmit={handleSubmit} onChangeCapture={(event) => { const name = Object.keys(fieldIds).find((key) => fieldIds[key] === event.target.id); if (name) setServerFieldErrors((previous) => { const next = { ...previous }; delete next[name]; return next; }); }} noValidate>
              <div data-signup-field>
                {fieldError("fullName")}

                <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-ink">
                  {t("signup.fullNameLabel")}
                </label>
                <input
                  id="fullName" {...fieldProps("fullName")}
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("signup.fullNamePlaceholder")}
                  className={fieldClass}
                />
              </div>

              <div data-signup-field>
                {fieldError("email")}

                <label htmlFor="signupEmail" className="mb-2 block text-sm font-medium text-ink">
                  {t("signup.emailLabel")}
                </label>
                <input
                  id="signupEmail" {...fieldProps("email")}
                  autoComplete="email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("signup.emailPlaceholder")}
                  className={fieldClass}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div data-signup-field>
                  {fieldError("password")}

                  <label htmlFor="signupPassword" className="mb-2 block text-sm font-medium text-ink">
                    {t("signup.passwordLabel")}
                  </label>
                  <div className="relative">
                    <input
                      id="signupPassword" {...fieldProps("password")}
                      autoComplete="new-password"
                      minLength={8}
                      type={showPassword ? "text" : "password"}
                      dir="ltr"
                      value={password}
                      onChange={(e) => changePassword(e, "password", setPassword)}
                      placeholder={t("signup.passwordPlaceholder")}
                      className={`${fieldClass} ps-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute end-1 top-1 grid h-10 w-10 place-items-center rounded-md text-ink-muted hover:bg-surface-alt"
                      aria-label={showPassword ? t("login.hidePassword", { ns: "auth" }) : t("login.showPassword", { ns: "auth" })}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-ink-muted">8 أحرف على الأقل، بالإنجليزي مع أرقام ورموز، بدون مسافات.</p>
                  <div className="mt-2 h-12">{password ? (
                    <>
                      <div className="flex gap-1.5" aria-hidden="true">
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
                  ) : null}</div>
                </div>

                <div data-signup-field>
                  {fieldError("confirmPassword")}

                  <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-ink">
                    {t("signup.confirmPasswordLabel")}
                  </label>
                  <input
                    id="confirmPassword" {...fieldProps("confirmPassword")}
                    autoComplete="new-password"
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    value={confirmPassword}
                    onChange={(e) => changePassword(e, "confirmPassword", setConfirmPassword)}
                    placeholder={t("signup.confirmPasswordPlaceholder")}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div data-signup-field>
                {fieldError("birthDate")}

                <label htmlFor="birthDate" className="mb-2 block text-sm font-medium text-ink">تاريخ الميلاد</label>
                <input id="birthDate" {...fieldProps("birthDate")} type="date" dir="ltr" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} min="1900-01-01" max={new Date().toISOString().slice(0, 10)} className={fieldClass} autoComplete="bday" required />
              </div>

              <div data-signup-field>
                {fieldError("stream")}

                <label htmlFor="stream" className="mb-2 block text-sm font-medium text-ink">
                  المسار الدراسي
                </label>
                <div className="relative">
                  <select id="stream" {...fieldProps("stream")} value={stream} onChange={(event) => setStream(event.target.value)} className={`${fieldClass} appearance-none`} required>
                    <option value="">اختر مسارك الدراسي</option>
                    {academicStreams.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                </div>
              </div>

              <div data-signup-field>
                {fieldError("schoolCode")}

                <label htmlFor="schoolCode" className="mb-2 block text-sm font-medium text-ink">{t("signup.schoolCodeLabel")}</label>
                <input id="schoolCode" {...fieldProps("schoolCode")} value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} placeholder="ENS-123" className={fieldClass} dir="ltr" />
                <p className="mt-1 text-xs leading-5 text-ink-muted">رمز خصم اختياري للمدارس المتعاقدة مع نبراس.</p>
              </div>

              <div data-signup-field>
                {fieldError("city")}

                <label htmlFor="signupCity" className="mb-2 block text-sm font-medium">المدينة</label>
                <select id="signupCity" {...fieldProps("city")} value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass} required><option value="">اختر مدينتك</option>{palestinianCities.map((city) => <option key={city}>{city}</option>)}</select>
              </div>
              <div>
                <p className="mb-3 text-sm font-medium">اختَر باقة الاشتراك</p>
                <SubscriptionPlanPicker value={subscriptionTier} onChange={setSubscriptionTier} disabled={submitting} includeFree compact />
                <p className="mt-2 text-xs leading-6 text-ink-muted">التجربة تبدأ من إنشاء الحساب. المدفوع يبدأ من التفعيل بعد الدفع التجريبي.</p>
              </div>
              <div data-signup-field>{fieldError("agreed")}<label className="flex items-start gap-3 text-sm text-ink-muted">
                <input
                  id="signupAgreed" {...fieldProps("agreed")} type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-border-strong aria-[invalid=true]:outline aria-[invalid=true]:outline-error text-primary focus:ring-primary/30"
                />
                <span>
                  {t("signup.agreePrefix")} <button type="button" className="text-primary hover:underline">{t("common:footer.termsOfService")}</button>{" "}
                  {t("signup.agreeAnd")} <button type="button" className="text-primary hover:underline">{t("common:footer.privacyPolicy")}</button>
                  {t("signup.agreeSuffix")}
                </span>
              </label></div>

              {error ? (
                <p id={errorId} role="alert" className="text-sm text-error">
                  {error}
                </p>
              ) : null}

              <Button type="submit" fullWidth size="lg" disabled={submitting}>
                {submitting ? t("signup.registrationInProgress") : t("signup.createAccountButton")} <ArrowRight size={18} className="rtl:-scale-x-100" />
              </Button>
            </form>

            <p className="mt-10 text-center text-sm text-ink-faint">{t("common:footer.copyright")}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
