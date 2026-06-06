import { useMemo, useState } from "react";
import { UserPlus, FileUp, Sparkles, GraduationCap, ArrowRight, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const steps = [
  { title: "Create account", desc: "Fast & simple registration.", icon: UserPlus },
  { title: "Upload materials", desc: "Drag and drop your textbooks or notes.", icon: FileUp },
  { title: "Let AI generate", desc: "Get personalized summaries and quizzes.", icon: Sparkles },
  { title: "Start learning", desc: "Master your curriculum with confidence.", icon: GraduationCap }
];

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const strength = useMemo(() => {
    if (password.length < 6) return "Weak";
    if (password.length < 10) return "Medium";
    return "Strong";
  }, [password]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Confirm Password must match Password.");
      return;
    }

    if (!agreed) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setError("");
    navigate("/analysis");
  };

  return (
    <div className="min-h-screen bg-[#efeff5] text-[#1b2131]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[48%_52%]">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1551c1] via-[#114ab7] to-[#0f45ae] px-8 py-8 text-white sm:px-12 lg:px-14 lg:py-10">
          <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute right-24 top-28 h-16 w-16 rounded-full bg-white/10 blur-xl" />
          <div className="absolute left-1/3 top-1/3 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute left-6 bottom-32 h-20 w-20 rounded-full bg-white/10 blur-xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#1450c0]">
              <GraduationCap size={22} />
            </div>
            <p className="text-4xl font-semibold tracking-tight">NIPRAS</p>
          </div>

          <div className="relative z-10 mt-12 max-w-[560px]">
            <h1 className="text-6xl font-semibold leading-tight">Start your Tawjihi journey today</h1>
            <p className="mt-5 text-[19px] leading-8 text-white/90">
              Join 2,400+ students learning with AI-powered personalized tutoring.
            </p>

            <div className="mt-10 space-y-7">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="relative flex gap-4">
                    {idx !== steps.length - 1 ? <span className="absolute left-[19px] top-11 h-10 w-px bg-white/35" /> : null}
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/40 bg-white/15">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-[40px] font-semibold leading-tight">{step.title}</p>
                      <p className="text-[16px] text-white/85">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute bottom-10 left-8 right-8 rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                <span className="h-8 w-8 rounded-full border-2 border-white bg-[#d84b5c]" />
                <span className="h-8 w-8 rounded-full border-2 border-white bg-[#efb84a]" />
                <span className="h-8 w-8 rounded-full border-2 border-white bg-[#37b17a]" />
              </div>
              <p className="text-[16px] text-white">Join our growing community of high achievers</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-[560px]">
            <h2 className="text-5xl font-semibold tracking-tight">Create your free account</h2>
            <p className="mt-3 text-[18px] text-[#5d6273]">
              Already have an account?{" "}
              <button type="button" onClick={() => navigate("/login")} className="text-[#1c57c9]">Log in</button>
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-[18px] font-medium">Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Mohammad Hamayl"
                  className="h-14 w-full rounded-xl border border-[#c8ccda] bg-[#f4f5fa] px-4 text-[20px] outline-none focus:border-[#1e56ce]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[18px] font-medium">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="h-14 w-full rounded-xl border border-[#c8ccda] bg-[#f4f5fa] px-4 text-[20px] outline-none focus:border-[#1e56ce]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[18px] font-medium">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-14 w-full rounded-xl border border-[#c8ccda] bg-[#f4f5fa] px-4 text-[20px] outline-none focus:border-[#1e56ce]"
                  />
                  <div className="mt-2 flex gap-1.5">
                    <span className={`h-1.5 flex-1 rounded ${strength !== "Weak" ? "bg-[#1656cb]" : "bg-[#b9c0d4]"}`} />
                    <span className={`h-1.5 flex-1 rounded ${strength === "Strong" || strength === "Medium" ? "bg-[#2f76e6]" : "bg-[#b9c0d4]"}`} />
                    <span className={`h-1.5 flex-1 rounded ${strength === "Strong" ? "bg-[#67a3ff]" : "bg-[#b9c0d4]"}`} />
                  </div>
                  <p className="mt-1 text-sm text-[#61687c]">Strength: {strength}</p>
                </div>

                <div>
                  <label className="mb-2 block text-[18px] font-medium">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-14 w-full rounded-xl border border-[#c8ccda] bg-[#f4f5fa] px-4 text-[20px] outline-none focus:border-[#1e56ce]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[18px] font-medium">Grade & Academic Stream</label>
                <div className="relative">
                  <select className="h-14 w-full appearance-none rounded-xl border border-[#c8ccda] bg-[#f4f5fa] px-4 text-[20px] outline-none">
                    <option>Grade 12 — Science Stream</option>
                  </select>
                  <ChevronDown size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#5f6578]" />
                </div>
              </div>

              <label className="flex items-center gap-3 text-[17px] text-[#4f566b]">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="h-5 w-5 rounded border-[#bac0d3]" />
                <span>
                  I agree to the <button type="button" className="text-[#1d57ca]">Terms of Service</button> and <button type="button" className="text-[#1d57ca]">Privacy Policy</button>.
                </span>
              </label>

              {error ? <p className="text-[15px] text-red-600">{error}</p> : null}

              <button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1453c6] text-[20px] font-semibold text-white hover:bg-[#1148ad]">
                Create Account <ArrowRight size={18} />
              </button>
            </form>

            <div className="my-8 flex items-center gap-4 text-[#81869a]">
              <span className="h-px flex-1 bg-[#cfd3e0]" />
              <span className="text-[14px] tracking-wide">OR SIGN UP WITH</span>
              <span className="h-px flex-1 bg-[#cfd3e0]" />
            </div>

            <button type="button" className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-[#c8ccda] bg-white text-[19px] text-[#252c3f]">
              <span className="text-2xl">G</span>
              Continue with Google
            </button>

            <p className="mt-12 text-center text-[16px] text-[#8a90a2]">© 2024 NIPRAS AI Learning. All rights reserved.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

