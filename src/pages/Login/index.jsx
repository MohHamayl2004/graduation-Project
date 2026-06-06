import { useState } from "react";
import { Eye, EyeOff, ArrowRight, Check, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();

    if (email === "NIPRAS" && password === "123") {
      setError("");
      navigate("/analysis");
      return;
    }

    setError("Invalid email or password");
  };

  return (
    <div className="min-h-screen bg-[#efeff5] text-[#1b2131]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[48%_52%]">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#2f63e0] via-[#2556cf] to-[#1d48bd] px-8 py-8 text-white sm:px-12 lg:px-14 lg:py-10">
          <div className="absolute -right-20 -top-20 h-[520px] w-[520px] rounded-full border border-white/15" />
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#2d5fd8]">
              <GraduationCap size={22} />
            </div>
            <p className="text-4xl font-semibold tracking-tight">NIPRAS</p>
          </div>

          <div className="mt-12 max-w-[560px]">
            <h1 className="text-5xl font-semibold leading-tight">Welcome back to NIPRAS</h1>
            <p className="mt-5 text-[19px] leading-8 text-white/90">
              Continue your personalized learning journey. Your AI tutor is waiting to help you excel in your Tawjihi exams.
            </p>
            <ul className="mt-8 space-y-4 text-[18px]">
              {["AI-generated lectures", "Adaptive quizzes", "Personalized daily study plans"].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20">
                    <Check size={16} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 max-w-[620px] overflow-hidden rounded-2xl border border-white/20 bg-[#091228] p-4 shadow-2xl">
            <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[radial-gradient(circle_at_center,_#11376e,_#091228_65%)]">
              <div className="h-[70%] w-[70%] rounded-3xl border border-[#2b4c7f] bg-[#0f1f3f] shadow-[0_20px_60px_rgba(0,0,0,0.45)]" />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-[540px]">
            <h2 className="text-5xl font-semibold tracking-tight">Sign in to NIPRAS</h2>
            <p className="mt-3 text-[18px] leading-8 text-[#5d6273]">
              Enter your credentials to access your academic dashboard.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-2 block text-[18px] font-medium">Email address</label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-14 w-full rounded-xl border border-[#c8ccda] bg-white px-4 text-[20px] outline-none transition focus:border-[#1e56ce] focus:ring-2 focus:ring-[#1e56ce]/20"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="text-[18px] font-medium">Password</label>
                  <button type="button" className="text-[17px] text-[#1f56cc]">Forgot password?</button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-14 w-full rounded-xl border border-[#c8ccda] bg-white px-4 pr-12 text-[20px] outline-none transition focus:border-[#1e56ce] focus:ring-2 focus:ring-[#1e56ce]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#596076]"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>

              {error ? <p className="text-[15px] text-red-600">{error}</p> : null}

              <button
                type="submit"
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1453c6] text-[20px] font-semibold text-white transition hover:bg-[#0f46ac]"
              >
                Sign In <ArrowRight size={18} />
              </button>
            </form>

            <div className="my-8 flex items-center gap-4 text-[#81869a]">
              <span className="h-px flex-1 bg-[#cfd3e0]" />
              <span className="text-[14px] tracking-wide">OR CONTINUE WITH</span>
              <span className="h-px flex-1 bg-[#cfd3e0]" />
            </div>

            <button
              type="button"
              className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-[#c8ccda] bg-white text-[19px] text-[#252c3f] transition hover:bg-[#f8f9fc]"
            >
              <span className="text-2xl">G</span>
              Continue with Google
            </button>

            <p className="mt-7 text-center text-[17px] text-[#5d6273]">
              Don&apos;t have an account? <button type="button" onClick={() => navigate("/signup")} className="font-semibold text-[#1f56cc]">Create one free</button>
            </p>

            <div className="mt-20 text-center text-[#767b8f]">
              <p className="text-[16px]">© 2024 NIPRAS AI Learning. All rights reserved.</p>
              <div className="mt-2 flex items-center justify-center gap-6 text-[16px]">
                <button type="button">Privacy Policy</button>
                <button type="button">Terms of Service</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}





