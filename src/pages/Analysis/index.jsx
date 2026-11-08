import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { getMaterials } from "../../services/materialService";
import { materialStatusLabel } from "../../services/materialStatus.js";

export default function Analysis() {
  const { auth } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setMaterials([]);
    setLoading(true);
    setError("");
    getMaterials(auth.token, { signal: controller.signal })
      .then(({ materials: saved }) => {
        if (!controller.signal.aborted) setMaterials(saved);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [auth.token, reload]);

  return (
    <div className="app-screen bg-surface text-ink">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="uploadMaterial" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar searchPlaceholder="المواد التعليمية" compact />
          <main className="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8">
            <div className="mx-auto max-w-[980px]">
              <h1 className="font-display text-3xl font-semibold">المواد المحفوظة</h1>
              <p className="mt-3 leading-7 text-ink-muted">
                تعرض هذه الصفحة حالة ملفاتك المسجلة في الخادم. حفظ الملف لا يعني تحليله أو إنشاء درس أو اختبار منه.
              </p>
              <Card className="mt-5">
                <h2 className="text-lg font-semibold">الرفع والتحليل الآلي غير متاحين من هذه الصفحة حاليًا</h2>
                <p className="mt-2 leading-7 text-ink-muted">
                  لا توجد خدمة معالجة ملفات متصلة بعد. يمكنك استخدام المعلّم الذكي أو إعداد خطتك الدراسية.
                </p>
                <div className="mt-4 flex flex-wrap gap-4">
                  <Link to="/ai-tutor" className="text-primary underline">افتح المعلّم الذكي</Link>
                  <Link to="/study-plan" className="text-primary underline">افتح الخطة الدراسية</Link>
                </div>
              </Card>
              {loading && <p role="status" className="mt-6">جارٍ تحميل المواد المحفوظة…</p>}
              {error && <div role="alert" className="mt-6 rounded-lg border border-error/30 p-4">
                <p className="text-error">{error}</p>
                <Button variant="outline" className="mt-3" onClick={() => setReload((value) => value + 1)}>إعادة المحاولة</Button>
              </div>}
              {!loading && !error && (materials.length ? <ul className="mt-6 space-y-3" aria-label="المواد المحفوظة">
                {materials.map((material) => <li key={material._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-4">
                  <h2 className="min-w-0 break-words font-semibold">{material.title}</h2>
                  <span className="text-sm text-ink-muted">{materialStatusLabel(material.status)}</span>
                </li>)}
              </ul> : <p className="mt-6 text-ink-muted">لا توجد مواد محفوظة في حسابك بعد.</p>)}
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
