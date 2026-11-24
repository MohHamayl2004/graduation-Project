# Reader design review

The verified textbook is Grade 12 mathematics for the scientific and industrial streams.

| Approach | Fit for NIPRAS |
| --- | --- |
| EPUB reflow | Useful for adaptable text. Converting the current fixed textbook pages would require a separate content pipeline and mathematical layout verification. |
| PDF.js | Preserves source page geometry and supports zoom. The existing reader already uses source page assets with interactive React content. |
| StPageFlip | Already installed and integrated with progress, RTL page mapping and activities. Retaining it keeps those interactions available. |
| Single page on narrow screens | Gives each source page more width. Wide screens can retain a spread. |

The selected change extends the existing reader with focus mode, larger text controls, keyboard page navigation and responsive page sizing. Source page zoom remains available. Existing curriculum data and activities are retained.

The initial agent tests cover page geometry, route-independent layout contracts and source preservation. They do not establish browser readability or performance. Browser checks are recorded separately by the leader.

Sources consulted for the comparison are the EPUB specification, PDF.js documentation and StPageFlip documentation.

- https://www.w3.org/TR/epub-33/
- https://mozilla.github.io/pdf.js/
- https://nodlik.github.io/StPageFlip/
