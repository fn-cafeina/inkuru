// Fixture from https://zonatmo.org/biblioteca (2026-10-31). Trimmed markup for parser checks.
export const CATALOG_FIXTURE = `
<div id="library-results">
  <div class="row" id="library-grid">
    <div class="element col-6 col-sm-6 col-md-4 col-lg-3 col-xl-2 mt-2" data-identifier="8232">
      <a href="https://zonatmo.org/library/manga/8232/one-punch-man">
        <div class="thumbnail book lazy-cover" data-bg="https://zonatmo.org/storage/mangas/covers/4j4OmAAYAfJ64M0om5WhauVH9V3Iv3OLZDaYbl0x.jpg?v=2">
          <img class="cover-bg-img" src="https://zonatmo.org/storage/mangas/covers/4j4OmAAYAfJ64M0om5WhauVH9V3Iv3OLZDaYbl0x.jpg?v=2" alt="" loading="lazy" width="200" height="300">
          <div class="thumbnail-title">
            <h4 class="text-truncate" title="ONE PUNCH-MAN">ONE PUNCH-MAN</h4>
          </div>
          <div class="book-card-badges-left">
            <span class="book-type badge badge-manga">MANGA</span>
            <span class="score"><i class="fas fa-star fa-fw"></i><span>9.50</span></span>
          </div>
          <div class="book-card-meta-stack">
            <div class="book-card-meta-bar">
              <div class="book-card-meta">
                <span class="book-meta-status meta-success">En emisión</span>
                <span class="book-meta-item" title="279 capítulo(s) publicado(s)">
                  <i class="fas fa-book-open fa-fw"></i> 279 caps
                </span>
              </div>
            </div>
          </div>
          <span class="demography seinen" title="Seinen">Seinen</span>
        </div>
      </a>
    </div>
    <div class="element col-6 col-sm-6 col-md-4 col-lg-3 col-xl-2 mt-2" data-identifier="5369">
      <a href="https://zonatmo.org/library/manhwa/5369/smyrna-capri">
        <div class="thumbnail book lazy-cover" data-bg="https://storage2.zonatmo.org/proxy/8f7c1a0265e92c4bc0c5f126e4c221b4.webp">
          <img class="cover-bg-img" src="https://storage2.zonatmo.org/proxy/8f7c1a0265e92c4bc0c5f126e4c221b4.webp" alt="" loading="lazy" width="200" height="300">
          <div class="thumbnail-title">
            <h4 class="text-truncate" title="Smyrna &amp; Capri">Smyrna &amp; Capri</h4>
          </div>
          <div class="book-card-badges-left">
            <span class="book-type badge badge-manhwa">MANHWA</span>
            <span class="score"><i class="fas fa-star fa-fw"></i><span>10.00</span></span>
          </div>
          <div class="book-card-meta-stack">
            <div class="book-card-meta-bar">
              <div class="book-card-meta">
                <span class="book-meta-status meta-secondary">Finalizado</span>
                <span class="book-meta-item" title="144 capítulo(s) publicado(s)">
                  <i class="fas fa-book-open fa-fw"></i> 144 caps
                </span>
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  </div>
</div>
`;

export const CATALOG_EMPTY_FIXTURE = `
<div id="library-results">
  <div class="row" id="library-grid"></div>
</div>
`;
