import { ArrowLeft, ArrowRight, CircleDot, ListChecks } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Card from "../../components/common/Card";
import { quizzes } from "../../data/quizzes/rateOfChange";
import MathText from "./MathText";
import QuizPlayer from "./QuizPlayer";
import "./quizzes.css";

const number = (n) => new Intl.NumberFormat("ar").format(n);

// The quizzes students can take, then one quiz at a time.
export default function Quizzes() {
  const [params] = useSearchParams();
  const quiz = quizzes.find((q) => q.id === params.get("quiz"));
  return <div className="app-screen bg-surface text-ink" dir="rtl">
    <div className="mx-auto flex h-full max-w-[1600px]">
      <Sidebar activeItem="quizzes" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar searchPlaceholder="ابحث عن موضوع أو سؤال أو ملاحظة..." showAvatar />
        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <div className="mx-auto max-w-4xl">
            {quiz ? <>
              <Link to="/quizzes" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-link hover:underline"><ArrowRight size={16} />كل الاختبارات</Link>
              <QuizPlayer key={quiz.id} quiz={quiz} />
            </> : <>
              <header className="mb-8 flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-tint text-primary"><ListChecks size={24} /></span>
                <div><h1 className="font-display text-3xl font-semibold text-ink">الاختبارات</h1>
                  <p className="mt-1 text-sm text-ink-muted">أسئلة من امتحانات سابقة، بتصحيح فوري وحل كامل لما تغلط.</p></div>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                {quizzes.map((q) => <Link key={q.id} to={`/quizzes?quiz=${q.id}`} className="qz-card">
                  <Card variant="interactive" padding="lg" className="h-full">
                    <p className="flex items-center gap-2 text-xs font-semibold text-accent"><CircleDot size={14} />{q.kind}</p>
                    <h2 className="mt-2 font-display text-2xl font-semibold text-ink">{q.subject} · {q.title}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{q.unit}</p>
                    <p className="qz-rule mt-4"><MathText>{q.rule}</MathText></p>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-ink-muted">{number(q.questions.length)} أسئلة</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-primary">ابدأ الاختبار<ArrowLeft size={16} /></span>
                    </div>
                  </Card>
                </Link>)}
              </div>
            </>}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  </div>;
}
