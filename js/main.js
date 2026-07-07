/* ============================================================
   ESPETO DÚ GRANDE — interações & motion
   ============================================================ */

/* ⚠️ CONFIGURE AQUI: número do WhatsApp com DDI + DDD (só dígitos) */
const WHATSAPP_NUMBER = '5511999999999';

const IS_TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   CARDÁPIO (dados)
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

function buildMenu() {
  Object.entries(MENU).forEach(([price, items]) => {
    const grid = document.querySelector(`[data-menu="${price}"]`);
    if (!grid) return;
    items.forEach(([name, desc]) => {
      const card = document.createElement('a');
      card.className = 'menu-card';
      card.href = '#';
      card.dataset.wa = '';
      card.dataset.waMsg = `Olá! Quero pedir um espeto de ${name} 🍢`;
      card.innerHTML = `
        <div class="menu-card-top">
          <h4>${name}</h4>
          <span class="menu-dots"></span>
          <span class="menu-price">R$ ${price}</span>
        </div>
        <p>${desc}</p>
        <span class="menu-order">Pedir no WhatsApp →</span>`;
      grid.appendChild(card);
    });
  });
}
buildMenu();

/* ============================================================
   WHATSAPP — todos os CTAs
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
document.querySelectorAll('a[href^="#"]:not([data-wa])').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
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
    .from('.hero-ctas .btn', { y: 26, opacity: 0, duration: 0.7, stagger: 0.12 }, '-=0.55')
    .from('#scrollHint', { opacity: 0, duration: 0.8 }, '-=0.2');
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
  gsap.to('#scrollHint', {
    scrollTrigger: { trigger: '.hero-scroll', start: 'top top', end: '30% top', scrub: true },
    opacity: 0,
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
   ESPETO — foto gira e dá zoom com o scroll
   ============================================================ */
if (!REDUCED) {
  gsap.fromTo('#espetoImg',
    { rotate: -8, rotationY: -24, scale: 0.88, y: 60 },
    {
      rotate: 6, rotationY: 22, scale: 1.08, y: -40,
      transformPerspective: 1100,
      ease: 'none',
      scrollTrigger: {
        trigger: '#espetoStage',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.7,
      },
    });
}

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
