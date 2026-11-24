import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as StPageFlip from 'page-flip';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import '../../i18n';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { lesson11Leaves, enginePage, logicalPage, restoredLeaf, fitBookStage } from '../../../shared/lessonFlipbook';
import { bookTutorQuestion } from '../../../shared/lessonBook';
import { getBookProgress, saveBookLeaf, saveBookAttempt } from '../../services/lessonBookService';
import FlipbookPage from './FlipbookPages';
import './living-book.css';

if (typeof window === 'undefined') {
  globalThis.window = { matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) };
}

function FocusIcon({ active, size = 16 }) {
  if (active) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h6v6m-6 6l6-6M9 21H3v-6m6-6l-6 6M21 9v-6h-6m-6 6L21 3M3 15v6h6m-6-6l6 6" />
    </svg>
  );
}

export function BookStage({ book, start, onRead, onAttempt, completed, onAsk, focusMode = false, onToggleFocus, textScale = 'normal', onSetTextScale }) {
  const mount = useRef(null), engine = useRef(null), onReadRef = useRef(onRead);
  const [current, setCurrent] = useState(start), [portrait, setPortrait] = useState(false), [turning, setTurning] = useState(false);
  const [spreadQuestion, setSpreadQuestion] = useState(null);
  const [nodes] = useState(() => typeof document === 'undefined' ? [] : lesson11Leaves.map(leaf => {
    const node = document.createElement('article');
    node.className = 'living-leaf'; node.dataset.leafId = leaf.id; node.dir = 'rtl';
    node.setAttribute('aria-label', leaf.label);
    return node;
  }));
  onReadRef.current = onRead;
  useEffect(() => { setSpreadQuestion(null); }, [current]);

  useEffect(() => {
    if (!mount.current) return;
    const factor = textScale === 'xlarge' ? 1.3 : textScale === 'large' ? 1.15 : 1;
    mount.current.style.setProperty('--living-font-scale', String(factor));
    mount.current.dataset.textScale = textScale;
    mount.current.dataset.focus = String(focusMode);
  }, [textScale, focusMode]);

  useEffect(() => {
    const host = document.createElement('div');
    host.className = 'living-engine'; host.dir = 'ltr'; mount.current.appendChild(host);
    let size = fitBookStage(mount.current.clientWidth, mount.current.clientHeight);
    const pageWidth = () => Math.max(1, Math.round(size.width / (size.portrait ? 1 : 2)));
    const pageHeight = () => Math.max(1, Math.round(size.height));
    const applySize = () => {
      host.style.width = `${size.width}px`; host.style.height = `${size.height}px`;
      mount.current.style.setProperty('--living-page-height', `${size.height}px`);
      mount.current.dataset.compact = String(size.height < 610);
    };
    applySize();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const flip = new StPageFlip.PageFlip(host, {
      width: pageWidth(), height: pageHeight(), size: 'stretch', minWidth: 280, maxWidth: 2000,
      minHeight: 1, maxHeight: 2000, startPage: enginePage(start),
      usePortrait: size.portrait, autoSize: false, showCover: false, drawShadow: !reduced.matches,
      maxShadowOpacity: 0.22, flippingTime: reduced.matches ? 1 : 650,
      useMouseEvents: false, showPageCorners: false, mobileScrollSupport: false,
      // Mouse handlers are disabled above. The corner-only gate also rejects
      // StPageFlip's own backward animation coordinates in portrait mode.
      disableFlipByClick: false,
    });
    engine.current = flip;
    let initialized = false, resizing = false, reading = start;
    const sync = (save = true) => {
      const single = flip.getOrientation() === 'portrait';
      const logical = logicalPage(flip.getCurrentPageIndex(), single);
      if (!resizing) reading = logical;
      setCurrent(logical); setPortrait(single);
      nodes.forEach((node, index) => {
        const visible = index === logical || (!single && index === logical + 1);
        node.inert = !visible; node.setAttribute('aria-hidden', String(!visible));
      });
      if (initialized && !resizing && save) onReadRef.current(lesson11Leaves[logical].id);
    };
    flip.on('flip', () => sync());
    flip.on('changeOrientation', () => sync(false));
    flip.on('changeState', event => setTurning(event.data !== 'read'));
    // React portals own stable original nodes. Copies are animation-only DOM,
    // never React roots; strip identifiers and block focus/events on every copy.
    const originals = new Set(nodes);
    const observer = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1 || !node.classList.contains('living-leaf') || originals.has(node)) continue;
        node.inert = true; node.setAttribute('aria-hidden', 'true'); node.dataset.animationCopy = 'true';
        node.removeAttribute('id'); node.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
      }
    });
    observer.observe(host, { childList: true, subtree: true });
    flip.loadFromHTML([...nodes].reverse());
    sync(false); initialized = true;
    const resize = new ResizeObserver(() => {
      const next = fitBookStage(mount.current.clientWidth, mount.current.clientHeight);
      if (Math.abs(next.width - size.width) < 0.1 && Math.abs(next.height - size.height) < 0.1 && next.portrait === size.portrait) return;
      const anchor = reading;
      resizing = true; size = next; applySize();
      flip.getSettings().width = pageWidth();
      flip.getSettings().height = pageHeight();
      flip.getSettings().usePortrait = size.portrait;
      flip.update();
      flip.turnToPage(enginePage(anchor));
      resizing = false; sync(false);
    });
    resize.observe(mount.current);
    return () => {
      initialized = false; resize.disconnect(); observer.disconnect();
      engine.current = null;
      flip.destroy();
    };
  }, [nodes, start]);

  const go = logical => {
    const flip = engine.current;
    if (!flip || flip.getState() !== 'read') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) flip.turnToPage(enginePage(logical));
    else flip.flip(enginePage(logical), 'bottom');
  };
  const turn = direction => go(Math.max(0, Math.min(lesson11Leaves.length - 1, current + direction * (portrait ? 1 : 2))));
  const closeQuestion = () => {
    spreadQuestion?.opener?.focus?.();
    setSpreadQuestion(null);
  };

  return <>
    <div
      className="living-stage"
      ref={mount}
      role="region"
      aria-label="كتاب متوسط التغير التفاعلي"
      aria-roledescription="flipbook"
      tabIndex={0}
      onKeyDown={event => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.target.closest('input, textarea, select, button, a, [contenteditable=true], .leaf-textbook-frame.is-zoomed')) return;
        if (event.key === 'ArrowLeft' || event.key === 'PageDown') {
          event.preventDefault();
          turn(1);
        } else if (event.key === 'ArrowRight' || event.key === 'PageUp') {
          event.preventDefault();
          turn(-1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          go(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          go(lesson11Leaves.length - 1);
        } else if (event.key === 'Escape' && focusMode && onToggleFocus) {
          event.preventDefault();
          onToggleFocus();
        }
      }}
    >
      {nodes.map((node, index) => {
        const isOriginal = lesson11Leaves[index].kind === 'original';
        const activeQuestion = isOriginal
          ? (portrait && spreadQuestion?.spreadIndex === index ? spreadQuestion : null)
          : (!portrait && spreadQuestion?.spreadIndex === index - 1 ? spreadQuestion : null);
        return createPortal(
          <FlipbookPage
            leaf={lesson11Leaves[index]}
            index={index}
            book={book}
            completed={completed}
            onAttempt={onAttempt}
            onAsk={onAsk}
            onGo={go}
            portrait={portrait}
            activeQuestion={activeQuestion}
            onSelectQuestion={isOriginal ? (question, mode, opener) => setSpreadQuestion(prev => ({ spreadIndex: index, question, mode, opener, seq: (prev?.seq || 0) + 1 })) : undefined}
            onCloseQuestion={closeQuestion}
            active={index === current || (!portrait && index === current + 1)}
          />,
          node,
          lesson11Leaves[index].id
        );
      })}
    </div>
    <nav className="living-navigation" aria-label="تقليب صفحات الكتاب">
      <button
        type="button"
        aria-label="الصفحة السابقة"
        title="الصفحة السابقة (السهم الأيمن)"
        disabled={turning || current === 0}
        onClick={() => turn(-1)}
      >
        <ArrowRight size={18} />
        <span>السابق</span>
      </button>
      <label className="living-select-label">
        <span className="sr-only">الانتقال إلى صفحة</span>
        <select
          aria-label="الانتقال إلى صفحة"
          disabled={turning}
          value={current}
          onChange={event => go(Number(event.target.value))}
        >
          {lesson11Leaves.map((leaf, i) => (
            <option key={leaf.id} value={i}>
              {i + 1} · {leaf.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        aria-label="الصفحة التالية"
        title="الصفحة التالية (السهم الأيسر)"
        disabled={turning || current >= lesson11Leaves.length - (portrait ? 1 : 2)}
        onClick={() => turn(1)}
      >
        <span>التالي</span>
        <ArrowLeft size={18} />
      </button>
    </nav>
    <p className="living-position" aria-live="polite">
      {portrait ? `صفحة ${current + 1}` : `صفحتا ${current + 1}–${Math.min(current + 2, lesson11Leaves.length)}`} / {lesson11Leaves.length}
      <span className="living-reading-dir"> · القراءة من اليمين إلى اليسار</span>
    </p>
  </>;
}

export default function LivingBook({ book }) {
  const { auth } = useAuth(), navigate = useNavigate();
  const [loaded, setLoaded] = useState(false), [start, setStart] = useState(0), [completed, setCompleted] = useState(false), [status, setStatus] = useState('loading');
  const [focusMode, setFocusMode] = useState(false);
  const [textScale, setTextScale] = useState('normal');
  const alive = useRef(true), queue = useRef(Promise.resolve()), lastLeaf = useRef(null), failedOperation = useRef(null);

  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    getBookProgress(auth.token, book.id, controller.signal).then(({ progress }) => {
      if (!alive.current) return;
      setStart(restoredLeaf(progress)); lastLeaf.current = progress?.bookLeaf;
      setCompleted(Boolean(progress?.completedActivities?.includes('example-1-rate'))); setStatus('ready');
    }).catch(error => { if (alive.current && error.name !== 'AbortError') setStatus('error'); }).finally(() => { if (alive.current) setLoaded(true); });
    return () => { alive.current = false; controller.abort(); };
  }, [auth.token, book.id]);

  const persist = operation => {
    setStatus('saving');
    queue.current = queue.current.catch(() => {}).then(operation).then(({ progress }) => {
      if (!alive.current) return;
      failedOperation.current = null;
      setCompleted(Boolean(progress.completedActivities?.includes('example-1-rate'))); setStatus('saved');
    }).catch(() => { if (alive.current) { failedOperation.current = operation; setStatus('error'); } });
  };

  return (
    <div className={`app-screen living-screen ${focusMode ? 'is-focus-mode' : ''}`} dir="rtl">
      <Sidebar activeItem="lectures" />
      <div className="living-workspace">
        <header className="living-header">
          <div className="living-header-main">
            <Link to="/lectures?subject=math" aria-label="العودة إلى مكتبة الرياضيات">
              <ArrowRight size={18} />
              <span>مكتبة الرياضيات</span>
            </Link>
            <div>
              <span className="living-wordmark">نِبراس</span>
              <h1>متوسط التغير <small>١–١</small></h1>
            </div>
          </div>
          <div className="living-header-tools">
            <div className="living-scale-controls" role="group" aria-label="حجم خط القراءة">
              <button
                type="button"
                className={`living-scale-btn ${textScale === 'normal' ? 'is-active' : ''}`}
                onClick={() => setTextScale('normal')}
                aria-pressed={textScale === 'normal'}
                title="حجم خط عادي (١٠٠٪)"
              >
                ع
              </button>
              <button
                type="button"
                className={`living-scale-btn is-large ${textScale === 'large' ? 'is-active' : ''}`}
                onClick={() => setTextScale('large')}
                aria-pressed={textScale === 'large'}
                title="حجم خط كبير (١١٥٪)"
              >
                ع+
              </button>
              <button
                type="button"
                className={`living-scale-btn is-xlarge ${textScale === 'xlarge' ? 'is-active' : ''}`}
                onClick={() => setTextScale('xlarge')}
                aria-pressed={textScale === 'xlarge'}
                title="حجم خط أكبر (١٣٠٪)"
              >
                ع++
              </button>
            </div>
            <button
              type="button"
              className={`living-focus-toggle ${focusMode ? 'is-active' : ''}`}
              onClick={() => setFocusMode(mode => !mode)}
              aria-pressed={focusMode}
              title={focusMode ? 'الخروج من وضع التركيز (Esc)' : 'وضع التركيز بدون مشتتات'}
            >
              <FocusIcon active={focusMode} size={15} />
              <span>{focusMode ? 'إنهاء التركيز' : 'وضع التركيز'}</span>
            </button>
            <a href={`${import.meta.env.BASE_URL}${book.pdf}`} target="_blank" rel="noreferrer" aria-label="فتح ملف الكتاب الأصلي">
              <BookOpen size={17} />
              <span>الكتاب الأصلي</span>
            </a>
          </div>
        </header>
        <main>
          <p className="living-edition">
            الرياضيات · الوحدة الأولى <span>نسخة تفاعلية من صفحات الكتاب ٤–٨</span>
          </p>
          {loaded ? (
            <BookStage
              book={book}
              start={start}
              completed={completed}
              focusMode={focusMode}
              onToggleFocus={() => setFocusMode(mode => !mode)}
              textScale={textScale}
              onSetTextScale={setTextScale}
              onAttempt={answer => persist(() => saveBookAttempt(auth.token, book.id, 'example-1-rate', answer))}
              onRead={id => {
                if (lastLeaf.current === id) return;
                lastLeaf.current = id;
                persist(() => saveBookLeaf(auth.token, id));
              }}
              onAsk={page => navigate('/ai-tutor', { state: { lessonQuestion: bookTutorQuestion(book.id, page) } })}
            />
          ) : (
            <p className="living-loading" role="status">نفتح الكتاب ونستعيد موضع قراءتك…</p>
          )}
          <div className="living-save" role="status">
            {status === 'saving'
              ? 'جارٍ حفظ التقدم…'
              : status === 'saved'
              ? '✓ حُفظ موضع القراءة والإنجاز'
              : status === 'error'
              ? 'تعذر الاتصال لحفظ أو استعادة التقدم.'
              : 'يُحفظ موضع القراءة وإنجاز المثال في حسابك.'}
            {status === 'error' && (
              <button
                type="button"
                onClick={() => {
                  if (failedOperation.current) persist(failedOperation.current);
                  else window.location.reload();
                }}
              >
                إعادة المحاولة
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
