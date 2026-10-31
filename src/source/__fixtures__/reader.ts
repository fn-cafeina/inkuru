// Fixture from https://zonatmo.org/view_uploads/1090001 (2026-10-31). Trimmed markup.
export const READER_FIXTURE = `
<div id="reader-header">
  <div class="reader-header-inner">
    <a href="https://zonatmo.org/library/manga/8232/one-punch-man" class="btn-rh" title="Volver al manga">
      <i class="fas fa-arrow-left"></i>
      <span class="d-none d-sm-inline">ONE PUNCH-MAN</span>
    </a>
    <select id="chapterSelect">
      <option value="https://zonatmo.org/view_uploads/1069384">Cap. 246 — Anterior</option>
      <option value="https://zonatmo.org/view_uploads/1081669"
          selected>Cap. 247 — Actual</option>
      <option value="https://zonatmo.org/view_uploads/1090001">Cap. 248 — Siguiente</option>
    </select>
    <div>
      <a href="https://zonatmo.org/view_uploads/1069384" class="btn-rh" title="Cap. anterior">
        <i class="fas fa-chevron-left"></i>
      </a>
      <a href="https://zonatmo.org/view_uploads/1090001" class="btn-rh" title="Cap. siguiente">
        <i class="fas fa-chevron-right"></i>
      </a>
    </div>
  </div>
</div>

<div id="reader-wrap">
  <div class="reader-img-wrap" id="rpage-1" data-page="1">
    <img src="https://storage2.zonatmo.org/chapters/1090001/1.webp" alt="Página 1" class="reader-image" loading="eager" fetchpriority="high" decoding="async">
  </div>
  <div class="reader-img-wrap" id="rpage-2" data-page="2">
    <img src="https://storage.zonatmo.org/chapters/1090001/2.webp" alt="Página 2" class="reader-image" loading="lazy" decoding="async">
  </div>
</div>
`;
