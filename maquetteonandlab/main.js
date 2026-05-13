/* One&Lab · main.js */
'use strict';

lucide.createIcons();

// ─── Nav scroll ───
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// ─── Slot selection ───
document.querySelectorAll('.slot').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.slot').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ─── FAQ accordion ───
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question').addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
    lucide.createIcons();
  });
});

// ─── Scroll reveal ───
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in-view');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.08 });

['.svc-card', '.bento-card', '.patient-focus-inner', '.faq-item'].forEach(sel => {
  document.querySelectorAll(sel).forEach((el, i) => {
    el.classList.add('reveal');
    if (i % 3 === 1) el.classList.add('delay-1');
    if (i % 3 === 2) el.classList.add('delay-2');
    revealObs.observe(el);
  });
});

// ─── Counters ───
function animateCount(el, target, duration = 1400) {
  const start = performance.now();
  const fmt = n => n >= 1000 ? new Intl.NumberFormat('fr-FR').format(n) : String(n);
  const tick = now => {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(ease * target));
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = fmt(target);
  };
  requestAnimationFrame(tick);
}

const cntObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    cntObs.unobserve(e.target);
    animateCount(e.target, parseInt(e.target.dataset.to, 10));
  });
}, { threshold: 0.5 });

document.querySelectorAll('.count').forEach(el => cntObs.observe(el));

window.addEventListener('load', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
});
