// Fixture from https://www.leercapitulo.co/manga/ (2026-10-26). Trimmed markup for parser checks.
export const CATALOG_FIXTURE = `
<main id="contenido">
  <form class="lc-panel p-3 mb-4" method="get" action="/manga/" data-filter-form></form>

  <article class="lc-card">
    <a class="lc-card-cover" href="/manga/psvkfbmjgo/one-piece/" tabindex="-1" aria-hidden="true">
      <img src="/covers/4f/1067e3fadaf8ec9edd6b71368445a7.jpg?v1793004892973" alt="" loading="lazy" width="248" height="352">
      <span class="lc-card-badge">Manga</span>
    </a>
    <div class="lc-card-body">
      <a class="lc-card-name d-block" href="/manga/psvkfbmjgo/one-piece/">One Piece</a>
      <a class="lc-chapter-link d-block mt-1" href="/leer/psvkfbmjgo/one-piece/1196/">Capitulo 1196</a>
      <span class="small lc-muted">Ongoing</span>
    </div>
  </article>

  <article class="lc-card">
    <a class="lc-card-cover" href="/manga/yjltthbtho/to-hell-with-being-heir-im-going-to-heal/" tabindex="-1" aria-hidden="true">
      <img src="/covers/af/6cc656c0219c2f49ae8cefe5641bd8.jpg?v1793004892973" alt="" loading="lazy" width="248" height="352">
      <span class="lc-card-badge">Manhwa</span>
    </a>
    <div class="lc-card-body">
      <a class="lc-card-name d-block" href="/manga/yjltthbtho/to-hell-with-being-heir-im-going-to-heal/">To Hell with Being Heir, I&#039;m going to Heal</a>
      <a class="lc-chapter-link d-block mt-1" href="/leer/yjltthbtho/to-hell-with-being-heir-im-going-to-heal/12/">Capitulo 12</a>
      <span class="small lc-muted">Ongoing</span>
    </div>
  </article>

  <nav class="mt-4" aria-label="Paginacion">
    <ul class="pagination">
      <li class="page-item"><a class="page-link" href="/manga/?page=2" rel="next" aria-label="Siguiente">&rsaquo;</a></li>
    </ul>
  </nav>
</main>
`;

export const CATALOG_EMPTY_FIXTURE = `
<main id="contenido">
  <form class="lc-panel p-3 mb-4" method="get" action="/manga/" data-filter-form></form>
  <div class="alert">No se encontraron resultados.</div>
</main>
`;
