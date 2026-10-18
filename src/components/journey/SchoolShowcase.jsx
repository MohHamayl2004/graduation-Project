import IntroFallback from './IntroFallback';
import './journey.css';

export default function SchoolShowcase() {
  return (
    <section id="nipras-school" className="school-showcase" aria-labelledby="school-heading">
      <IntroFallback />
      <div className="school-showcase-shade" />
      <div className="school-showcase-heading">
        <span className="journey-eyebrow">من أول خطوة، معك</span>
        <h2 id="school-heading">أهلًا في عالم نبراس.</h2>
        <p>مكان بيفتحلك أبواب المعرفة.</p>
      </div>
    </section>
  );
}
