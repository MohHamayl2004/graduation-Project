import { useEffect, useRef, useState } from 'react';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export default function PdfPage({ file, pageNumber, zoom }) {
  const frame = useRef(null), canvas = useRef(null);
  const previousRender = useRef(Promise.resolve());
  const [document, setDocument] = useState(null);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false, task;
    setDocument(null); setError('');
    import('pdfjs-dist').then(pdfjs => {
      if (cancelled) return;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      task = pdfjs.getDocument(file);
      return task.promise.then(pdf => { if (!cancelled) setDocument(pdf); });
    }).catch(() => { if (!cancelled) setError('تعذر فتح صفحة الكتاب.'); });
    return () => { cancelled = true; task?.destroy(); };
  }, [file]);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const resize = () => setWidth(node.clientWidth);
    const observer = new ResizeObserver(resize);
    observer.observe(node); resize();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!document || !width || !canvas.current) return;
    let cancelled = false, renderTask;
    const currentRender = previousRender.current.catch(() => {}).then(() => document.getPage(pageNumber)).then(page => {
      if (cancelled) return;
      const original = page.getViewport({ scale: 1 });
      const scale = (Math.min(width - 4, 1200) / original.width) * zoom;
      const viewport = page.getViewport({ scale: Math.max(scale, 0.1) });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const element = canvas.current;
      element.width = Math.floor(viewport.width * pixelRatio);
      element.height = Math.floor(viewport.height * pixelRatio);
      element.style.width = `${viewport.width}px`;
      element.style.height = `${viewport.height}px`;
      renderTask = page.render({ canvasContext: element.getContext('2d'), viewport, transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0] });
      return renderTask.promise;
    }).catch(error => { if (!cancelled && error?.name !== 'RenderingCancelledException') setError('تعذر عرض صفحة الكتاب.'); });
    previousRender.current = currentRender;
    return () => { cancelled = true; renderTask?.cancel(); };
  }, [document, pageNumber, width, zoom]);

  return <div className="book-pdf-frame" ref={frame} tabIndex={0} role="region" aria-label="صفحة الكتاب؛ يمكن التمرير عند التكبير">
    {error ? <p role="alert">{error} <a href={file} target="_blank" rel="noreferrer">افتح ملف الكتاب</a></p> : <canvas ref={canvas} aria-label={`صفحة الكتاب ${pageNumber}`} />}
    {!document && !error && <p role="status">جاري تحميل الكتاب…</p>}
  </div>;
}
