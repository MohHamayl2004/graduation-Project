import { useMemo, useState } from "react";
import { Bell, CircleHelp, Search, Sparkles, RotateCcw, CheckSquare, Square, FlaskConical, Sigma, Clock3, Trophy, CheckCircle2 } from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import { userProfile } from "../../data/userProfile";
import { initialStudyTasks, weeklyScheduleBlocks } from "../../data/mockStudyPlan";

export default function StudyPlan() {
  const [tasks, setTasks] = useState(initialStudyTasks);
  const [appliedMsg, setAppliedMsg] = useState("");
  const toggleTask = (id) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  };

  const applySuggestions = () => {
    setAppliedMsg("Suggestions applied successfully!");
    setTimeout(() => setAppliedMsg(""), 1800);
  };

  const completedCount = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);

  return (
    <div className="h-screen bg-[#f1f2f7] text-[#1c2337]">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="Study Plan" userName={userProfile.name} userTrack={userProfile.stream} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[#d7dbe8] bg-[#f8f8fc] px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-14 w-full max-w-[520px] items-center gap-3 rounded-full border border-[#c9cfde] bg-[#edeff7] px-4 text-[#5e6578]">
                <Search size={21} />
                <input
                  type="text"
                  placeholder="Search your materials..."
                  className="w-full bg-transparent text-[18px] outline-none placeholder:text-[#6f7588]"
                />
              </div>

              <div className="flex items-center gap-4 text-[#343b50]">
                <button type="button" className="rounded-full p-2 hover:bg-[#eaedf6]"><Bell size={20} /></button>
                <button type="button" className="rounded-full p-2 hover:bg-[#eaedf6]"><CircleHelp size={20} /></button>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[54px] font-semibold leading-tight text-[#0f1730]">My Study Plan</h1>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#efe2ff] px-3 py-1 text-sm font-semibold text-[#6b3ceb]"><Sparkles size={14} />AI Generated</span>
                </div>
                <p className="mt-1 text-[20px] text-[#4f566b]">Your personalized learning roadmap for the 2024 Tawjihi Exams.</p>
              </div>
              <button type="button" className="flex items-center gap-2 rounded-xl bg-[#1657cb] px-5 py-3 text-[18px] font-medium text-white hover:bg-[#124bad]">
                Regenerate Plan <RotateCcw size={16} />
              </button>
            </div>

            <section className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <article className="rounded-2xl border border-[#cfd4e2] bg-white">
                  <div className="flex items-center justify-between border-b border-[#e2e6f1] px-6 py-4">
                    <h2 className="text-[42px] font-semibold">Today&apos;s Tasks</h2>
                    <p className="text-[17px] text-[#4e556a]">Monday, Oct 24</p>
                  </div>

                  <div className="space-y-3 p-4">
                    {tasks.map((task) => (
                      <div key={task.id} className={`flex items-center justify-between rounded-xl border px-4 py-4 ${task.done ? "border-[#d4d8e5] bg-[#fbfbfe]" : "border-[#dde1ec] bg-[#f3f5fd]"}`}>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => toggleTask(task.id)} className="text-[#5f86d8]">
                            {task.done ? <CheckSquare size={22} /> : <Square size={22} />}
                          </button>
                          <div>
                            <p className={`text-[18px] ${task.done ? "text-[#798096 line-through" : "text-[#1f273b]"}`}>{task.title}</p>
                            <div className="mt-1 flex items-center gap-3 text-sm text-[#525a6f]">
                              {!task.done && (
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${task.priority === "HIGH" ? "bg-[#fde4e2] text-[#dc3f36]" : "bg-[#fdebc7] text-[#ad6c00]"}`}>
                                  {task.priority}
                                </span>
                              )}
                              {!task.done && (
                                <>
                                  <span className="inline-flex items-center gap-1"><FlaskConical size={13} /> {task.subject}</span>
                                  <span className="inline-flex items-center gap-1"><Clock3 size={13} /> {task.duration}</span>
                                </>
                              )}
                              {task.done && <span className="inline-flex items-center gap-1 text-[#2d9c66]"><CheckCircle2 size={14} /> Completed</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-[17px] text-[#5f6578]">{task.done ? task.duration : "Start ?"}</div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-[#cfd4e2] bg-white">
                  <div className="border-b border-[#e2e6f1] px-6 py-4">
                    <h2 className="text-[42px] font-semibold">Weekly Schedule</h2>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-7 gap-2 text-center text-[16px] text-[#596077]">
                      {Object.keys(weeklyScheduleBlocks).map((day) => (
                        <div key={day}>
                          <p className="mb-2">{day}</p>
                          <div className="space-y-1">
                            {weeklyScheduleBlocks[day].length ? (
                              weeklyScheduleBlocks[day].map((block, idx) => (
                                <div key={block} className={`rounded-md border px-2 py-2 text-left text-xs ${idx % 3 === 0 ? "border-[#9cd7a7] bg-[#e8f6ec] text-[#1f7a35]" : idx % 3 === 1 ? "border-[#b7c9ef] bg-[#edf2ff] text-[#1b53c0]" : "border-[#d2bdf4] bg-[#f3ecff] text-[#6f42ef]"}`}>
                                  {block}
                                </div>
                              ))
                            ) : (
                              <div className="grid h-24 place-items-center rounded-md border border-dashed border-[#cfd4e2] bg-[#fafbff] text-[#9298ab]"><Trophy size={16} /></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              </div>

              <div className="space-y-4">
                <article className="rounded-2xl border border-[#cfd4e2] bg-white p-6">
                  <h2 className="text-[42px] font-semibold">Learning Goals</h2>
                  <div className="mt-4 flex justify-center">
                    <div className="relative grid h-32 w-32 place-items-center rounded-full border-[7px] border-[#1456c8]">
                      <div className="text-center">
                        <p className="text-[35px] font-semibold">53%</p>
                        <p className="text-[10px] font-semibold tracking-wide">DAILY TARGET</p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-center text-[40px] font-semibold">1h 20m / 2h 30m</p>

                  <p className="mt-6 text-xs font-semibold tracking-[0.16em] text-[#666d82]">WEEKLY CONSISTENCY</p>
                  <div className="mt-3">
                    <div className="flex h-24 items-end gap-1">
                      {[68, 84, 52, 34, 63, 16, 4].map((h, i) => (
                        <div key={String(h) + String(i)} className="flex-1 rounded-t bg-[#1b56c6]" style={{ height: `${h}%`, opacity: 0.5 + i * 0.06 }} />
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-[#646b80]"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
                  </div>
                </article>

                <article className="rounded-2xl border border-[#d9c9f3] bg-[#f6f1ff] p-6">
                  <h2 className="flex items-center gap-2 text-[42px] font-semibold text-[#5f35c8]"><Sparkles size={18} />Smart Recommendations</h2>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-[#d8c8f2] bg-white p-3">
                      <p className="text-[17px] font-semibold">Biology Focus</p>
                      <p className="text-[16px] text-[#4f566b]">Your recent quiz shows weakness in Genetics. Spend 20m on Punnett squares.</p>
                    </div>
                    <div className="rounded-xl border border-[#d8c8f2] bg-white p-3">
                      <p className="text-[17px] font-semibold">Physics Overdue</p>
                      <p className="text-[16px] text-[#4f566b]">Electricity unit is 3 days behind schedule. Adjusting plan to catch up.</p>
                    </div>
                    <div className="rounded-xl border border-[#d8c8f2] bg-white p-3">
                      <p className="text-[17px] font-semibold">Math Ahead</p>
                      <p className="text-[16px] text-[#4f566b]">You&apos;ve mastered Calculus I early! Unlock advanced differentiation today?</p>
                    </div>
                  </div>
                  <button type="button" onClick={applySuggestions} className="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-[#6f42f3] to-[#8446ec] text-[18px] font-medium text-white">
                    Apply All Suggestions
                  </button>
                  {appliedMsg ? <p className="mt-2 text-center text-sm text-[#2b8c5f]">{appliedMsg}</p> : null}
                </article>
              </div>
            </section>
          </main>

          <footer className="border-t border-[#d7dbe8] bg-[#f8f8fc] px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[#4f556b]">
              <p className="text-[16px]"><span className="font-semibold text-[#1456c8]">NIPRAS</span> © 2024 NIPRAS AI Learning. All rights reserved.</p>
              <div className="flex flex-wrap items-center gap-8 text-[16px]">
                <button type="button">About Us</button>
                <button type="button">Privacy Policy</button>
                <button type="button">Terms of Service</button>
                <button type="button">Support</button>
              </div>
            </div>
            <p className="mt-2 text-xs text-[#8a90a2]">Completed today: {completedCount} / {tasks.length} tasks</p>
          </footer>
        </div>
      </div>
    </div>
  );
}







