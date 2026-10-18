import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, Sigma, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/common/Logo";
import "./login.css";
import { login } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

function MathBook() {
  return <div className="login-book" aria-hidden="true">
    <div className="login-book-shadow" />
    <div className="login-book-page login-book-page-back"><BookOpen size={30} /><span>لغة المعرفة</span></div>
    <div className="login-book-page login-book-page-middle"><Sigma size={34} /><span>اكتشف العالم</span></div>
    <div className="login-book-spine" />
    <div className="login-book-page login-book-page-right"><strong>مادة الرياضيات</strong><i /><div className="login-formula">a² + b² = c²</div><div className="login-graph"><span /><span /><span /></div><small>كل سؤال هو فرصة لاكتشاف شرح جديد</small></div>
    <div className="login-book-page login-book-page-left"><GraduationCap size={31} /><span>رحلتك تبدأ من هنا</span></div>
  </div>;
}

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { t } = useTranslation(["auth", "common"]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const errorId = useId();
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await login({ email, password });
      signIn(response);
      setError("");
      navigate(response.user.role === "admin" ? "/admin" : !response.user.subscription?.canAccess || !response.user.city ? "/subscription" : "/dashboard");
    } catch (requestError) {
      setError(requestError.message || t("login.errorInvalid"));
    } finally { setSubmitting(false); }
  };

  return <main className="login-shell" dir="rtl">
    <div className="login-card">
      <section className="login-form-panel lg:order-2" aria-labelledby="login-title">
        <div className="login-form-content">
          <div className="login-mobile-logo"><Logo height={30} /></div>
          <span className="login-badge"><GraduationCap size={15} /> بالعلم نبني مستقبلك</span>
          <h1 id="login-title">{t("login.signInTitle")}</h1>
          <p className="login-intro">أدخل بياناتك عشان توصل لصفحتك الدراسية وتكمل رحلتك التعليمية.</p>
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div><label htmlFor="email">{t("login.emailLabel")}</label><div className="login-input-wrap"><Mail size={19} aria-hidden="true" /><input id="email" type="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("login.emailPlaceholder")} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} autoComplete="email" /></div></div>
            <div><label htmlFor="password">{t("login.passwordLabel")}</label><div className="login-input-wrap"><LockKeyhole size={19} aria-hidden="true" /><input id="password" type={showPassword ? "text" : "password"} dir="ltr" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("login.passwordPlaceholder")} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} autoComplete="current-password" /><button type="button" className="login-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            <p id={errorId} role={error ? "alert" : undefined} className="login-error min-h-12">{error || "\u00a0"}</p>
            <button className="duo-press duo-primary" type="submit" disabled={submitting}>{submitting ? "جارٍ تسجيل الدخول…" : t("login.signInButton")} <ArrowRight size={19} className="rtl:-scale-x-100" /></button>
          </form>
          <p className="login-signup">لستَ لديك حساب؟ <button type="button" onClick={() => navigate("/signup")}>أنشئ حسابًا مجانًا</button></p>
        </div>
      </section>
      <section className="login-brand-panel lg:order-1" aria-label="نبراس، رحلة في الرياضيات">
        <div className="login-brand-orbit login-brand-orbit-one" /><div className="login-brand-orbit login-brand-orbit-two" />
        <Logo variant="white" height={36} className="relative z-10" /><p className="login-brand-tagline">منصة تعليمية تضيء مستقبلك</p>
        <div className="login-brand-copy"><h2>رحلة في <em>الرياضيات</em></h2><p>كل صفحة تفتح لك آفاقًا جديدة من المعرفة</p></div>
        <MathBook /><div className="login-brand-note login-brand-note-left"><Sparkles size={16} /> المعرفة تبدأ من هنا</div><div className="login-brand-note login-brand-note-right">كل صفحة تصنع فرقًا في مستقبلك</div><div className="login-brand-chips"><span>أفكار</span><span>مهارات</span><span>مستقبل أفضل</span></div>
      </section>
    </div>
  </main>;
}
