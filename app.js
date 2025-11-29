async function loadData() {
  try {
    const [cardsRes, linksRes, orderRes] = await Promise.all([
      fetch('cards.json'),
      fetch('links.json'),
      fetch('order.json')
    ]);
    const cards = await cardsRes.json();
    const links = await linksRes.json();
    const orderCfg = await orderRes.json().catch(() => ({ full: cards.map(c=>c.id), collapsed: cards.map(c=>c.id) }));

    const grid = document.getElementById('grid');
    const gridCollapsed = document.getElementById('grid-collapsed');
    const modalEl = document.getElementById('qr-modal');
    const imgEl = document.getElementById('qr-img');
    const openAnchor = document.getElementById('qr-open-link');
    const closeEl = document.getElementById('qr-close');

    function showQR(url) {
      const primary = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(url);
      const fallback = 'https://chart.googleapis.com/chart?cht=qr&chs=220x220&chl=' + encodeURIComponent(url);
      imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = fallback; };
      imgEl.src = primary;
      openAnchor.href = url;
      modalEl.classList.remove('hidden');
      document.body.classList.add('no-scroll');
    }
    function hideQR() { modalEl.classList.add('hidden'); document.body.classList.remove('no-scroll'); }
    closeEl.addEventListener('click', hideQR);
    modalEl.addEventListener('click', e => { if (e.target === modalEl) hideQR(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hideQR(); });

    function buildHero(card) {
      const hero = document.createElement('section');
      hero.className = 'hero';
      const head = document.createElement('div');
      head.style.fontWeight = '700';
      head.style.marginBottom = '8px';
      head.textContent = card.header;
      const qr = document.createElement('div');
      qr.className = 'qr';
      const urlHero = (links[card.id] && (links[card.id]['1x'] || links[card.id]['avista'])) || null;
      if (urlHero) {
        const img = document.createElement('img');
        const primary = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(urlHero);
        const fallback = 'https://chart.googleapis.com/chart?cht=qr&chs=220x220&chl=' + encodeURIComponent(urlHero);
        img.onerror = () => { img.onerror = null; img.src = fallback; };
        img.src = primary;
        qr.appendChild(img);
      }
      const title = document.createElement('h1');
      title.className = 'title';
      title.textContent = card.avista;
      const subtitle = document.createElement('h2');
      subtitle.className = 'subtitle';
      subtitle.textContent = card.subtitle;
      hero.appendChild(head);
      hero.appendChild(qr);
      hero.appendChild(title);
      hero.appendChild(subtitle);
      return hero;
    }

    function buildList(card) {
      const ul = document.createElement('ul');
      ul.className = 'price-list';
      card.items.forEach(it => {
        const li = document.createElement('li');
        li.className = 'price-item';
        const span = document.createElement('span');
        span.textContent = it.label;
        const btnOpen = document.createElement('button');
        btnOpen.className = 'btn';
        btnOpen.textContent = 'Abrir link';
        btnOpen.setAttribute('data-card', card.id);
        btnOpen.setAttribute('data-key', it.key);
        btnOpen.setAttribute('data-action', 'open');
        const btnQR = document.createElement('button');
        btnQR.className = 'btn';
        btnQR.textContent = 'QRCode';
        btnQR.setAttribute('data-card', card.id);
        btnQR.setAttribute('data-key', it.key);
        btnQR.setAttribute('data-action', 'qr');
        li.appendChild(span);
        li.appendChild(btnOpen);
        li.appendChild(btnQR);
        ul.appendChild(li);
      });
      return ul;
    }

    const byId = Object.fromEntries(cards.map(c => [c.id, c]));

    function isCategory(card, cat) {
      const h = (card.header || '').toLowerCase();
      return cat === 'legado' ? h.includes('legado') : h.includes('aliança');
    }

    function render(cat) {
      grid.innerHTML = '';
      gridCollapsed.innerHTML = '';
      const fullOrder = orderCfg.full.map(id => byId[id]).filter(Boolean).filter(c => isCategory(c, cat));
      fullOrder.forEach(card => {
        const wrap = document.createElement('div');
        wrap.className = 'card';
        wrap.appendChild(buildHero(card));
        wrap.appendChild(buildList(card));
        grid.appendChild(wrap);
      });

      const collapsedOrder = orderCfg.collapsed.map(id => byId[id]).filter(Boolean).filter(c => isCategory(c, cat));
      collapsedOrder.forEach(card => {
        const wrap = document.createElement('div');
        wrap.className = 'card';
        wrap.appendChild(buildHero(card));
        const details = document.createElement('details');
        details.className = 'collapse';
        const summary = document.createElement('summary');
        summary.className = 'collapse-summary';
        summary.textContent = 'Ver parcelas';
        details.appendChild(summary);
        const content = document.createElement('div');
        content.className = 'collapse-content';
        content.appendChild(buildList(card));
        details.appendChild(content);
        wrap.appendChild(details);
        gridCollapsed.appendChild(wrap);
      });
    // removed generic button handler to avoid interfering with QR and modal actions
      const buttonsQR = document.querySelectorAll('.btn[data-card][data-key][data-action="qr"]');
      buttonsQR.forEach(btn => {
        const cid = btn.getAttribute('data-card');
        const key = btn.getAttribute('data-key');
        const url = (links[cid] && links[cid][key]) || links[key];
        if (!url) { btn.disabled = true; return; }
        btn.addEventListener('click', () => showQR(url));
      });
    }

    // ensure modal closes when changing category/page
    let currentCategory = 'legado';
    function setPage(name) {
      document.getElementById('page-full').classList.toggle('hidden', name !== 'full');
      document.getElementById('page-collapsed').classList.toggle('hidden', name !== 'collapsed');
      document.querySelectorAll('.nav-link-page').forEach(a => a.classList.toggle('active', a.dataset.page === name));
    }
    document.querySelectorAll('.nav-link-page').forEach(a => {
      a.addEventListener('click', ev => { ev.preventDefault(); hideQR(); setPage(a.dataset.page); });
    });
    document.querySelectorAll('.nav-link-cat').forEach(a => {
      a.addEventListener('click', ev => {
        ev.preventDefault();
        currentCategory = a.dataset.cat;
        document.querySelectorAll('.nav-link-cat').forEach(x => x.classList.toggle('active', x.dataset.cat === currentCategory));
        render(currentCategory);
        hideQR();
      });
    });
    render(currentCategory);
    setPage('full');
  } catch (e) {
    const grid = document.getElementById('grid');
    grid.textContent = 'Erro ao carregar dados';
  }
}

loadData();
