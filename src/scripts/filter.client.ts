import { CATEGORIES, CATEGORY_META } from '../lib/categories';
import { matches } from '../lib/filter';

const mount = document.querySelector<HTMLElement>('[data-filter-mount]');
if (mount) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-slug]'));
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
  let active: string | null = null;

  mount.innerHTML = `
    <div class="axi-toolbar">
      <div class="axi-search" style="flex: 1 1 220px; max-width: 320px">
        <span class="axi-search__icon" aria-hidden="true">&#8981;</span>
        <label class="axi-sr-only" for="app-search">Search apps</label>
        <input class="axi-input" id="app-search" type="search" placeholder="Search the suite…" />
      </div>
    </div>
    <div class="axi-row" style="--axi-row-gap: 6px; margin-top: 10px" data-pills role="group" aria-label="Filter by category"></div>
    <p class="site-filter-status axi-sr-only" data-filter-status aria-live="polite"></p>
    <p class="axi-notice site-filter-empty" data-filter-empty hidden>Nothing matches that.</p>`;

  const input = mount.querySelector<HTMLInputElement>('#app-search')!;
  const pills = mount.querySelector<HTMLElement>('[data-pills]')!;
  const status = mount.querySelector<HTMLElement>('[data-filter-status]')!;
  const empty = mount.querySelector<HTMLElement>('[data-filter-empty]')!;

  for (const category of CATEGORIES) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'axi-pill';
    pill.textContent = CATEGORY_META[category].label;
    pill.dataset.category = category;
    pill.setAttribute('aria-pressed', 'false');
    pills.append(pill);
  }

  function apply() {
    const query = input.value;
    let visibleCount = 0;
    for (const card of cards) {
      const hit = matches(
        { search: card.dataset.search ?? '', category: card.dataset.category ?? '' },
        query,
        active,
      );
      card.toggleAttribute('data-filter-hidden', !hit);
      if (hit) visibleCount += 1;
    }
    // A section with nothing left in it is noise, so it goes too.
    for (const section of sections) {
      const visible = section.querySelectorAll('[data-slug]:not([data-filter-hidden])').length;
      section.toggleAttribute('data-filter-hidden', visible === 0);
    }
    empty.hidden = visibleCount !== 0;
    status.textContent =
      visibleCount === 0
        ? 'Nothing matches that.'
        : `${visibleCount} app${visibleCount === 1 ? '' : 's'} shown.`;
  }

  input.addEventListener('input', apply);
  pills.addEventListener('click', (event) => {
    const pill = (event.target as HTMLElement).closest<HTMLElement>('[data-category]');
    if (!pill) return;
    active = active === pill.dataset.category ? null : (pill.dataset.category ?? null);
    for (const p of pills.querySelectorAll<HTMLElement>('[data-category]')) {
      p.setAttribute('aria-pressed', String(p.dataset.category === active));
    }
    apply();
  });
}
