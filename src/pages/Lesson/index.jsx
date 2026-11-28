import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import StudentBadge from '../../components/common/StudentBadge';
import { useAuth } from '../../context/AuthContext';
import { lessonBooks, lessonPage, bookTutorQuestion } from '../../../shared/lessonBook';
import { getBookProgress, saveBookAttempt, saveBookPage } from '../../services/lessonBookService';
import PdfPage from './PdfPage';
import SecantActivity from './SecantActivity';
import LivingBook from './LivingBook';
import './book.css';

function BookReader({ book }) {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1), [zoom, setZoom] = useState(1);
  const [progress, setProgress] = useState(null), [saveState, setSaveState] = useState('loading');
  const touched = useRef(false), active = useRef(true), queue = useRef(Promise.resolve());
  const reference = lessonPage(book.id, page);
  const file = `${import.meta.env.BASE_URL}${book.pdf}`;

  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    getBookProgress(auth.token, book.id, controller.signal).then(result => {
      if (!active.current) return;
      if (!touched.current) {
        setProgress(result.progress);
        if (lessonPage(book.id, result.progress?.lastPage)) setPage(result.progress.lastPage);
        setSaveState(result.progress ? 'saved' : 'empty');
      }
    }).catch(error => { if (active.current && error.name !== 'AbortError') setSaveState('error'); });
    return () => { active.current = false; controller.abort(); };
  }, [auth.token, book.id]);

  const persist = useCallback(operation => {
    touched.current = true;
    setSaveState('saving');
    queue.current = queue.current.catch(() => {}).then(operation).then(result => {
      if (active.current) { setProgress(result.progress); setSaveState('saved'); }
    }).catch(() => { if (active.current) setSaveState('error'); });
  }, []);

  const go = useCallback(next => {
    if (!lessonPage(book.id, next) || next === page) return;
    touched.current = true;
    setPage(next);
    persist(() => saveBookPage(auth.token, book.id, next));
  }, [auth.token, book.id, page, persist]);

  useEffect(() => {
    const onKey = event => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input, textarea, select, button, a, [contenteditable=true]')) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); go(page + 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); go(page - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, page]);

  const ask = () => navigate('/ai-tutor', { state: { lessonQuestion: bookTutorQuestion(book.id, page) } });
  const saveMessage = { loading: 'جاري تحميل التقدم…', empty: 'لم يُحفظ تقدم بعد', saving: 'جاري حفظ التقدم…', saved: 'تم حفظ التقدم', error: 'تعذر حفظ التقدم؛ يمكنك متابعة القراءة والمحاولة.' }[saveState];

  return <div className="app-screen book-screen" dir="rtl">
    <header className="book-header"><StudentBadge /><Link className="book-back" to="/lectures?subject=math" aria-label="العودة إلى دروس الرياضيات"><ArrowRight size={20} /></Link><div><span>الرياضيات · الدرس {book.id}</span><h1>{book.title}</h1></div></header>
    <main className="book-main">
      <div className="book-toolbar">
        <div className="book-pagination"><button type="button" onClick={() => go(page - 1)} disabled={page === 1} aria-label="الصفحة السابقة"><ChevronRight size={19} /></button><span>صفحة الكتاب {reference.printedPage.toLocaleString('ar')} <small>({page.toLocaleString('ar')} / {book.pageCount.toLocaleString('ar')})</small></span><button type="button" onClick={() => go(page + 1)} disabled={page === book.pageCount} aria-label="الصفحة التالية"><ChevronLeft size={19} /></button></div>
        <div className="book-zoom"><button type="button" aria-label="تصغير الصفحة" disabled={zoom <= 0.75} onClick={() => setZoom(value => Math.max(0.75, value - 0.25))}><Minus size={18} /></button><span dir="ltr">{Math.round(zoom * 100)}%</span><button type="button" aria-label="تكبير الصفحة" disabled={zoom >= 2} onClick={() => setZoom(value => Math.min(2, value + 0.25))}><Plus size={18} /></button></div>
      </div>
      <p className="book-save-status" role="status">{saveMessage}</p>
      <div className={`book-layout${reference.activityId ? ' book-layout-with-activity' : ''}`}>
        <div className="book-reading"><PdfPage file={file} pageNumber={page} zoom={zoom} /></div>
        {reference.activityId && <aside className="book-activity-panel"><SecantActivity key={reference.activityId} showExercise={reference.activityId === 'example-1-rate'} completed={progress?.completedActivities?.includes('example-1-rate')} onAttempt={answer => persist(() => saveBookAttempt(auth.token, book.id, 'example-1-rate', answer))} onAsk={ask} /></aside>}
      </div>
      {book.id !== '1-1' && <p className="book-pending">الأنشطة التفاعلية لهذا الدرس قيد الإعداد؛ يمكنك قراءة الكتاب الآن.</p>}
      <div className="book-footer"><button type="button" onClick={() => go(page - 1)} disabled={page === 1}>الصفحة السابقة</button><button type="button" onClick={() => go(page + 1)} disabled={page === book.pageCount}>الصفحة التالية</button></div>
    </main>
  </div>;
}

export default function Lesson() {
  const { code = '1-1' } = useParams();
  const book = lessonBooks.find(item => item.id === code);
  if (!book) return <main className="p-6" dir="rtl"><p>هذا الدرس غير متاح حاليًا.</p><Link to="/lectures?subject=math">العودة إلى دروس الرياضيات</Link></main>;
  return book.id === '1-1' ? <LivingBook book={book} /> : <BookReader key={book.id} book={book} />;
}
