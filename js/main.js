/* ============================================================
   ESPETO DÚ GRANDE — interações, carrinho & motion
   ============================================================ */

/* ⚠️ CONFIGURE AQUI: número do WhatsApp com DDI + DDD (só dígitos) */
/* PROVISÓRIO — número definitivo: 5519992560635 (19 99256-0635) */
const WHATSAPP_NUMBER = '5519998493780'; // (19) 99849-3780

const IS_TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   CARDÁPIO (dados) — [nome, descrição]  (preço vem da chave)
   ============================================================ */
const MENU = {
  10: [
    ['Carne Miolo', 'Cortes macios do miolo, selados na brasa.'],
    ['Carne Mista', 'O equilíbrio perfeito de carnes selecionadas.'],
    ['Panceta', 'Crocante por fora, suculenta por dentro.'],
    ['Frango', 'Marinado no tempero especial da casa.'],
    ['Linguiça Caseira', 'Receita artesanal, sabor de verdade.'],
    ['Linguiça na Brasa', 'Defumada lentamente no ponto certo.'],
    ['Coração', 'O clássico do churrasco, temperinho na medida.'],
    ['Queijo Coalho', 'Dourado na brasa, derrete na boca.'],
    ['Queijo Provolone', 'Intenso, derretido e levemente defumado.'],
    ['Pão de Alho', 'Cremoso, tostado e irresistível.'],
    ['Pão Doce', 'O contraste doce que surpreende.'],
    ['Tulipa', 'Asinha suculenta com casquinha crocante.'],
  ],
  12: [
    ['Kafta de Queijo', 'Carne temperada com recheio cremoso.'],
    ['Kafta de Costela', 'Sabor profundo de costela na brasa.'],
    ['Carneiro', 'Sabor marcante, maciez surpreendente.'],
    ['Medalhão de Frango', 'Envolto no bacon, suculência garantida.'],
    ['Medalhão de Quiabo', 'Quiabo com bacon, crocante e suculento.'],
  ],
};

/* Bebidas — [nome, descrição, preço]  (⚠️ ajuste os preços)
   Obs.: chopp NÃO entra aqui — é servido só no local. */
const DRINKS = [
  ['Cerveja Long Neck', 'A gelada certa pra acompanhar a brasa.', 10],
  ['Refrigerante Lata', 'Coca, Guaraná ou Fanta — bem gelado.', 6],
  ['Água Mineral', 'Com ou sem gás.', 4],
];

/* slug estável a partir do nome (id do item) */
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
function slug(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(DIACRITICS, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* ícone "+" reutilizável */
const PLUS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>';

/* markup do controle de adicionar/quantidade */
function addCtrl(id, name, price) {
  return `
    <div class="add-ctrl" data-id="${id}" data-name="${name}" data-price="${price}">
      <button class="add-btn" type="button" aria-label="Adicionar ${name} ao pedido">
        ${PLUS_SVG}<span>Adicionar</span>
      </button>
      <div class="qty" hidden>
        <button class="qty-btn" type="button" data-dec aria-label="Remover um ${name}">−</button>
        <span class="qty-n">0</span>
        <button class="qty-btn" type="button" data-inc aria-label="Adicionar mais um ${name}">+</button>
      </div>
    </div>`;
}

function menuCard(name, desc, price) {
  const id = slug(name);
  const card = document.createElement('article');
  card.className = 'menu-card';
  card.innerHTML = `
    <div class="menu-card-main">
      <div class="menu-card-top">
        <h4>${name}</h4>
        <span class="menu-dots"></span>
        <span class="menu-price">R$ ${price}</span>
      </div>
      <p>${desc}</p>
    </div>
    ${addCtrl(id, name, price)}`;
  return card;
}

function buildMenu() {
  Object.entries(MENU).forEach(([price, items]) => {
    const grid = document.querySelector(`[data-menu="${price}"]`);
    if (!grid) return;
    items.forEach(([name, desc]) => grid.appendChild(menuCard(name, desc, +price)));
  });
  const drinksGrid = document.querySelector('[data-drinks]');
  if (drinksGrid) DRINKS.forEach(([name, desc, price]) => drinksGrid.appendChild(menuCard(name, desc, price)));
}
buildMenu();

/* ============================================================
   CARRINHO — estado + persistência
   ============================================================ */
const cart = new Map(); // id -> { id, name, price, qty }
const LS_KEY = 'duGrandeCart';

function brl(v) { return 'R$ ' + v.toFixed(2).replace('.', ','); }

function cartTotals() {
  let count = 0, total = 0;
  cart.forEach((it) => { count += it.qty; total += it.price * it.qty; });
  return { count, total };
}

function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...cart.values()])); } catch (e) {}
}
/* itens que saíram do cardápio de delivery (não restaurar do localStorage) */
const REMOVED_IDS = ['chopp-gelado'];

function restore() {
  try {
    (JSON.parse(localStorage.getItem(LS_KEY) || '[]') || []).forEach((it) => {
      if (it && it.id && !REMOVED_IDS.includes(it.id)) {
        cart.set(it.id, { id: it.id, name: it.name, price: +it.price, qty: +it.qty });
      }
    });
  } catch (e) {}
}

function addToCart(id, name, price) {
  const it = cart.get(id);
  if (it) it.qty++;
  else cart.set(id, { id, name, price: +price, qty: 1 });
  bumpBar();
  syncUI();
}
function decFromCart(id) {
  const it = cart.get(id);
  if (!it) return;
  it.qty--;
  if (it.qty <= 0) cart.delete(id);
  syncUI();
}

/* ============================================================
   CARRINHO — interface
   ============================================================ */
const cartBar = document.getElementById('cartBar');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');

function bumpBar() {
  if (!cartBar) return;
  cartBar.classList.remove('bump');
  void cartBar.offsetWidth; // reinicia a animação
  cartBar.classList.add('bump');
}

function syncUI() {
  /* controles de cada card */
  document.querySelectorAll('.add-ctrl').forEach((ctrl) => {
    const qty = cart.get(ctrl.dataset.id)?.qty || 0;
    const addBtn = ctrl.querySelector('.add-btn');
    const qtyBox = ctrl.querySelector('.qty');
    if (qty > 0) {
      addBtn.hidden = true; qtyBox.hidden = false;
      qtyBox.querySelector('.qty-n').textContent = qty;
    } else {
      addBtn.hidden = false; qtyBox.hidden = true;
    }
    ctrl.closest('.menu-card, .feature-card')?.classList.toggle('in-cart', qty > 0);
  });

  /* barra flutuante */
  const { count, total } = cartTotals();
  const cb = document.getElementById('cartCountBar');
  const tb = document.getElementById('cartTotalBar');
  if (cb) cb.textContent = count;
  if (tb) tb.textContent = brl(total);
  document.body.classList.toggle('has-cart', count > 0);

  if (cartDrawer?.classList.contains('open')) renderDrawer();
  persist();
}

function renderDrawer() {
  const wrap = document.getElementById('cartItems');
  const empty = document.getElementById('cartEmpty');
  const form = document.getElementById('cartForm');
  const foot = document.getElementById('cartFoot');
  if (!wrap) return;

  if (cart.size === 0) {
    wrap.innerHTML = '';
    empty.hidden = false; form.hidden = true; foot.hidden = true;
    return;
  }
  empty.hidden = true; form.hidden = false; foot.hidden = false;

  let total = 0, html = '';
  cart.forEach((it) => {
    const sub = it.price * it.qty; total += sub;
    html += `
      <div class="ci" data-id="${it.id}" data-name="${it.name}" data-price="${it.price}">
        <div class="ci-info">
          <span class="ci-name">${it.name}</span>
          <span class="ci-unit">${brl(it.price)} / un</span>
        </div>
        <div class="qty ci-qty">
          <button class="qty-btn" type="button" data-dec aria-label="Remover um">−</button>
          <span class="qty-n">${it.qty}</span>
          <button class="qty-btn" type="button" data-inc aria-label="Adicionar um">+</button>
        </div>
        <span class="ci-sub">${brl(sub)}</span>
      </div>`;
  });
  wrap.innerHTML = html;
  document.getElementById('cartTotalDrawer').textContent = brl(total);
}

function openCart() {
  renderDrawer();
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cart-open');
  if (lenis) lenis.stop();
}
function closeCart() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('cart-open');
  if (lenis) lenis.start();
}

/* toast de confirmação */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ============================================================
   CARRINHO — eventos (delegação)
   ============================================================ */
document.addEventListener('click', (e) => {
  const add = e.target.closest('.add-btn');
  const inc = e.target.closest('[data-inc]');
  const dec = e.target.closest('[data-dec]');
  if (!add && !inc && !dec) return;
  const ctrl = e.target.closest('.add-ctrl, .ci');
  if (!ctrl) return;
  const { id, name, price } = ctrl.dataset;
  if (add || inc) addToCart(id, name, +price);
  else decFromCart(id);
});

/* abrir / fechar o carrinho */
cartBar?.addEventListener('click', openCart);
cartOverlay?.addEventListener('click', closeCart);
document.getElementById('cartClose')?.addEventListener('click', closeCart);
document.querySelectorAll('[data-cart-open]').forEach((b) =>
  b.addEventListener('click', (e) => { e.preventDefault(); openCart(); }));

/* "Ver cardápio" dentro do carrinho vazio */
document.getElementById('emptyBrowse')?.addEventListener('click', (e) => {
  e.preventDefault();
  closeCart();
  const target = document.getElementById('cardapio');
  if (lenis) lenis.scrollTo(target, { offset: -20, duration: 1.4 });
  else target?.scrollIntoView({ behavior: 'smooth' });
});

/* fechar com ESC */
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && cartDrawer?.classList.contains('open')) closeCart();
});

/* ============================================================
   CHECKOUT — monta a mensagem e envia pro WhatsApp
   ============================================================ */
const cartForm = document.getElementById('cartForm');

/* mostra o campo de troco só no Dinheiro */
cartForm?.addEventListener('change', (e) => {
  if (e.target.name === 'pagamento') {
    const troco = document.getElementById('trocoWrap');
    if (troco) troco.hidden = e.target.value !== 'Dinheiro';
  }
});

/* ⚠️ SEGURANÇA: a mensagem NÃO leva preços de propósito — o cliente
   poderia editá-los antes de enviar. O total aparece só no site, e o
   atendimento confirma os valores pelo cardápio oficial. */
function buildOrderMessage(d) {
  const L = [];
  L.push('*🍢 NOVO PEDIDO — Espeto Dú Grande*');
  L.push('');
  L.push('*🧾 Itens:*');
  cart.forEach((it) => {
    L.push(`• ${it.qty}x ${it.name}`);
  });
  L.push('━━━━━━━━━━━━━━━');
  L.push(`*👤 Nome:* ${d.nome}`);
  L.push(`*📍 Endereço:* ${d.endereco}`);
  let pag = `*💳 Pagamento:* ${d.pag}`;
  if (d.pag === 'Dinheiro' && d.troco) pag += ` (troco para ${d.troco})`;
  L.push(pag);
  if (d.obs) L.push(`*📝 Observações:* ${d.obs}`);
  L.push('');
  L.push('_Pedido enviado pelo site ✅_');
  return L.join('\n');
}

cartForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (cart.size === 0) { showToast('Seu carrinho está vazio 🙂'); return; }
  const f = new FormData(cartForm);
  const data = {
    nome: (f.get('nome') || '').trim(),
    endereco: (f.get('endereco') || '').trim(),
    pag: f.get('pagamento'),
    troco: (f.get('troco') || '').trim(),
    obs: (f.get('obs') || '').trim(),
  };
  if (!data.nome || !data.endereco || !data.pag) return; // required do HTML cobre
  const msg = encodeURIComponent(buildOrderMessage(data));
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  showToast('Pedido enviado no WhatsApp! 🔥');
});

/* estado inicial do carrinho */
restore();
syncUI();

/* ============================================================
   WHATSAPP — CTAs de contato direto (sem carrinho)
   ============================================================ */
document.querySelectorAll('[data-wa]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const msg = encodeURIComponent(el.dataset.waMsg || 'Olá! Vim pelo site do Espeto Dú Grande.');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  });
});

/* ============================================================
   LENIS — scroll fluido
   ============================================================ */
let lenis = null;
if (!REDUCED) {
  lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.95, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* âncoras internas com Lenis */
document.querySelectorAll('a[href^="#"]:not([data-wa]):not([data-cart-open])').forEach((a) => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    document.getElementById('navLinks')?.classList.remove('open');
    document.getElementById('navBurger')?.classList.remove('open');
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ============================================================
   PRELOADER
   ============================================================ */
const preloader = document.getElementById('preloader');
let pageReady = false;
window.addEventListener('load', () => { pageReady = true; });
setTimeout(function hidePreloader() {
  if (!pageReady && performance.now() < 6000) return setTimeout(hidePreloader, 200);
  preloader.classList.add('done');
  introTimeline();
}, 1400);

/* ============================================================
   HERO — entrada
   ============================================================ */
function introTimeline() {
  if (REDUCED) return;
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('#heroLogo', { scale: 0.6, opacity: 0, duration: 1.1, ease: 'back.out(1.6)' })
    .to('.hero-title .line > span', { yPercent: 0, duration: 1.1, stagger: 0.12 }, '-=0.55')
    .from('.hero-sub', { y: 30, opacity: 0, duration: 0.9 }, '-=0.6')
    .from('.hero-ctas .btn', { y: 26, opacity: 0, duration: 0.7, stagger: 0.12 }, '-=0.55');
}
/* estado inicial do text reveal */
if (!REDUCED) gsap.set('.hero-title .line > span', { yPercent: 110 });

/* ============================================================
   HERO — vídeo em loop automático com transição suave
   (dois <video> com a mesma fonte: perto do fim, o segundo
   começa do zero e entra num crossfade — sem corte seco)
   ============================================================ */
const videoA = document.getElementById('heroVideo');
const videoB = document.getElementById('heroVideoB');
const LOOP_FADE = 1.1; // segundos de crossfade no reinício

let heroActive = videoA;
let heroStandby = videoB;
let crossfading = false;

videoA.play().catch(() => {
  /* autoplay bloqueado: tenta de novo na primeira interação */
  const kick = () => { videoA.play().catch(() => {}); window.removeEventListener('pointerdown', kick); };
  window.addEventListener('pointerdown', kick);
});

gsap.ticker.add(() => {
  const d = heroActive.duration;
  if (!d || crossfading || heroActive.paused) return;
  if (heroActive.currentTime >= d - LOOP_FADE) {
    crossfading = true;
    heroStandby.currentTime = 0;
    heroStandby.play().catch(() => {});
    /* o vídeo B fica por cima no empilhamento: quem anima é sempre ele —
       fade para 1 quando entra (A→B) e fade para 0 revelando o A (B→A) */
    gsap.to(videoB, {
      opacity: heroStandby === videoB ? 1 : 0,
      duration: LOOP_FADE,
      ease: 'power1.inOut',
    });
    gsap.delayedCall(LOOP_FADE, () => {
      heroActive.pause();
      const t = heroActive; heroActive = heroStandby; heroStandby = t;
      crossfading = false;
    });
  }
});

/* conteúdo do hero: parallax + fade conforme sai da tela */
if (!REDUCED) {
  gsap.to('#heroContent', {
    scrollTrigger: {
      trigger: '.hero-scroll',
      start: 'top top',
      end: 'bottom 25%',
      scrub: 0.6,
    },
    y: -90,
    opacity: 0,
    scale: 0.96,
    ease: 'none',
  });
  /* leve zoom cinematográfico no vídeo enquanto o hero sai */
  gsap.fromTo('.hero-video', { scale: 1.12 }, {
    scrollTrigger: { trigger: '.hero-scroll', start: 'top top', end: 'bottom top', scrub: 0.8 },
    scale: 1.02,
    ease: 'none',
  });
}

/* ============================================================
   NAVBAR
   ============================================================ */
const nav = document.getElementById('nav');
ScrollTrigger.create({
  start: 80,
  onUpdate: () => {},
  onToggle: (self) => nav.classList.toggle('scrolled', self.isActive),
});
document.getElementById('navBurger').addEventListener('click', function () {
  this.classList.toggle('open');
  document.getElementById('navLinks').classList.toggle('open');
});

/* FAB do WhatsApp aparece depois do hero */
ScrollTrigger.create({
  trigger: '.marquee',
  start: 'top 80%',
  onEnter: () => document.getElementById('waFab').classList.add('show'),
  onLeaveBack: () => document.getElementById('waFab').classList.remove('show'),
});

/* ============================================================
   REVEALS genéricos
   ============================================================ */
if (!REDUCED) {
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.fromTo(el,
      { y: 46, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 1.05,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
  });

  /* cards do cardápio em cascata */
  gsap.utils.toArray('.menu-grid').forEach((grid) => {
    gsap.fromTo(grid.children,
      { y: 40, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 0.8,
        stagger: 0.06,
        ease: 'power3.out',
        scrollTrigger: { trigger: grid, start: 'top 85%', once: true },
      });
  });
}

/* ============================================================
   ESPETO — foto estática (sem animação de scroll)
   ============================================================ */

/* ============================================================
   CHOPP — vídeo com play só quando visível + parallax
   ============================================================ */
const choppVideo = document.querySelector('.chopp-video');
ScrollTrigger.create({
  trigger: '.chopp',
  start: 'top 90%',
  end: 'bottom 10%',
  onEnter: () => choppVideo.play().catch(() => {}),
  onEnterBack: () => choppVideo.play().catch(() => {}),
  onLeave: () => choppVideo.pause(),
  onLeaveBack: () => choppVideo.pause(),
});
if (!REDUCED) {
  gsap.fromTo('.chopp-video', { yPercent: -8 }, {
    yPercent: 8,
    ease: 'none',
    scrollTrigger: { trigger: '.chopp', start: 'top bottom', end: 'bottom top', scrub: 0.8 },
  });
}

/* ============================================================
   CONTADORES
   ============================================================ */
gsap.utils.toArray('[data-count]').forEach((el) => {
  const end = +el.dataset.count;
  ScrollTrigger.create({
    trigger: el,
    start: 'top 90%',
    once: true,
    onEnter: () => {
      gsap.fromTo(el, { innerText: 0 }, {
        innerText: end,
        duration: 1.8,
        ease: 'power2.out',
        snap: { innerText: 1 },
      });
    },
  });
});

/* ============================================================
   BRASAS — partículas em canvas
   ============================================================ */
function embers(canvasId, count, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || REDUCED) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles = [], running = false;

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    w = canvas.width = r.width;
    h = canvas.height = r.height;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawn() {
    return {
      x: Math.random() * w,
      y: h + 10 + Math.random() * 40,
      r: 0.6 + Math.random() * (opts.size || 2.2),
      vy: 0.35 + Math.random() * 1.1,
      vx: (Math.random() - 0.5) * 0.5,
      drift: Math.random() * Math.PI * 2,
      life: 0,
      maxLife: 240 + Math.random() * 200,
      hue: 18 + Math.random() * 26,
    };
  }
  for (let i = 0; i < count; i++) {
    const p = spawn();
    p.y = Math.random() * h;
    p.life = Math.random() * p.maxLife;
    particles.push(p);
  }

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life++;
      p.drift += 0.02;
      p.x += p.vx + Math.sin(p.drift) * 0.4;
      p.y -= p.vy;
      const fade = 1 - p.life / p.maxLife;
      if (p.y < -12 || fade <= 0) { particles[i] = spawn(); continue; }
      const flicker = 0.55 + 0.45 * Math.sin(p.life * 0.15 + p.drift);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 95%, ${55 + flicker * 12}%, ${(0.5 * fade * flicker).toFixed(3)})`;
      ctx.shadowColor = `hsla(${p.hue}, 95%, 55%, ${0.6 * fade})`;
      ctx.shadowBlur = 8;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    requestAnimationFrame(frame);
  }

  /* roda só quando visível (economiza bateria) */
  new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const wasRunning = running;
      running = en.isIntersecting;
      if (running && !wasRunning) frame();
    });
  }, { threshold: 0.02 }).observe(canvas);
}

embers('embersHero', 55);
embers('embersMenu', 26, { size: 1.6 });
embers('embersCta', 60, { size: 2.6 });

/* ============================================================
   TILT sutil nos cards de destaque (desktop)
   ============================================================ */
if (!IS_TOUCH && !REDUCED) {
  document.querySelectorAll('.feature-card').forEach((card) => {
    let raf = null;
    card.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `translateY(-8px) scale(1.012) perspective(900px) rotateY(${px * 5}deg) rotateX(${py * -5}deg)`;
        raf = null;
      });
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}
