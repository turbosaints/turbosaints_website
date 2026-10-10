// =============================================================================
//  TURBOSAINTS — script.js  (single-page version)
// =============================================================================

// ── footer year ──────────────────────────────────────────────────────────────
const yr = document.getElementById("year");
if (yr) yr.textContent = new Date().getFullYear();

// ── smooth-scroll nav anchors ─────────────────────────────────────────────────
document.querySelectorAll(".nav-anchor").forEach((a) => {
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (!href || !href.startsWith("#")) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const navH = document.querySelector(".site-nav")?.offsetHeight || 76;
    const top  = target.getBoundingClientRect().top + window.scrollY - navH;
    window.scrollTo({ top, behavior: "smooth" });
    // close mobile menu if open
    document.querySelector(".nav-links")?.classList.remove("open");
  });
});

// ── mobile nav toggle ────────────────────────────────────────────────────────
const navToggle = document.querySelector(".nav-toggle");
const navLinks  = document.querySelector(".nav-links");
if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
}

// ── active nav link on scroll (IntersectionObserver) ─────────────────────────
const sections   = ["home", "team", "our-car", "sponsors"];
const navAnchors = {};
sections.forEach((id) => {
  navAnchors[id] = document.querySelector(`.nav-links a[href="#${id}"]`);
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      Object.values(navAnchors).forEach((a) => a?.classList.remove("active"));
      navAnchors[id]?.classList.add("active");
    }
  });
}, { rootMargin: "-60px 0px -60% 0px", threshold: 0 });

sections.forEach((id) => {
  const el = document.getElementById(id);
  if (el) observer.observe(el);
});

// =============================================================================
//  SCROLL-DRIVEN F1 BUILD ANIMATION
// =============================================================================
(function () {
  const pin = document.querySelector(".build-pin");
  if (!pin) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const easeOutExpo   = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  const easeOutBack   = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const easeOutBounce = (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1/d)     return n * t * t;
    if (t < 2/d)     return n * (t -= 1.5/d)  * t + 0.75;
    if (t < 2.5/d)   return n * (t -= 2.25/d) * t + 0.9375;
                     return n * (t -= 2.625/d) * t + 0.984375;
  };
  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const lerp    = (a, b, t) => a + (b - a) * t;

  const PARTS = [
    { id: "floor",       from: [0, 120, 0, 1, 0.6],      range: [0.00, 0.14], ease: easeOutExpo,   label: "lbl-floor",       assembleAt: 0.14 },
    { id: "chassis",     from: [0, 200, 0, 1, 0.4],      range: [0.06, 0.22], ease: easeOutBack,   label: "lbl-chassis",     assembleAt: 0.22 },
    { id: "susp-rear",   from: [340, 30, 18, 0.5, 1],    range: [0.18, 0.32], ease: easeOutExpo,   label: "lbl-susp-rear",   assembleAt: 0.32 },
    { id: "susp-front",  from: [-340, 30, -18, 0.5, 1],  range: [0.20, 0.34], ease: easeOutExpo,   label: "lbl-susp-front",  assembleAt: 0.34 },
    { id: "wheel-rear",  from: [380, 60, 360, 0.3, 0.3], range: [0.28, 0.44], ease: easeOutBounce, label: "lbl-wheel-rear",  assembleAt: 0.44 },
    { id: "wheel-front", from: [-380, 60, -360, 0.3, 0.3], range: [0.30, 0.46], ease: easeOutBounce, label: "lbl-wheel-front", assembleAt: 0.46 },
    { id: "front-wing",  from: [-300, 80, -22, 0.4, 1],  range: [0.50, 0.64], ease: easeOutExpo,   label: "lbl-front-wing",  assembleAt: 0.64 },
    { id: "rear-wing",   from: [200, -260, 30, 0.4, 0.4], range: [0.56, 0.72], ease: easeOutBack,  label: "lbl-rear-wing",   assembleAt: 0.72 },
    { id: "exhaust",     from: [0, -160, 0, 0.2, 0.2],   range: [0.64, 0.78], ease: easeOutExpo,   label: "lbl-exhaust",     assembleAt: 0.78 },
  ];

  const STAGE_LABELS = [
    [0.00, "PREPARING BUILD"], [0.06, "LAYING FLOOR"],    [0.18, "MOUNTING CHASSIS"],
    [0.28, "SUSPENSION"],      [0.40, "WHEELS"],           [0.50, "COCKPIT & HALO"],
    [0.56, "AERO PACKAGE"],    [0.72, "POWER UNIT"],       [0.80, "FINAL CHECKS"],
    [0.92, "BUILD COMPLETE"],
  ];

  const partEls  = {}, labelEls = {};
  PARTS.forEach(({ id, label }) => {
    partEls[id]  = document.getElementById(id);
    labelEls[id] = document.getElementById(label);
  });

  const buildBar   = document.getElementById("build-bar");
  const buildLabel = document.getElementById("build-label");
  const canvas     = document.getElementById("spark-canvas");
  const ctx        = canvas ? canvas.getContext("2d") : null;
  const sparks     = [];

  function burstSparks(el, count = 28) {
    if (!canvas || !ctx || !el) return;
    const cBB = canvas.getBoundingClientRect();
    const eBB = el.getBoundingClientRect();
    const cx = (eBB.left + eBB.width  / 2) - cBB.left;
    const cy = (eBB.top  + eBB.height / 2) - cBB.top;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5;
      const bright = Math.random() > 0.6;
      sparks.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1, decay: 0.018 + Math.random() * 0.025,
        size: bright ? 2.5 + Math.random() * 2 : 1 + Math.random() * 1.5,
        color: bright ? "#ffffff" : (Math.random() > 0.5 ? "#e2131c" : "#ff8800"),
        trail: [],
      });
    }
  }

  function tickSparks() {
    if (!ctx || sparks.length === 0) return;
    if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
      canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 6) s.trail.shift();
      s.x += s.vx; s.y += s.vy; s.vy += 0.18; s.vx *= 0.97; s.life -= s.decay;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      for (let t = 0; t < s.trail.length - 1; t++) {
        ctx.beginPath(); ctx.moveTo(s.trail[t].x, s.trail[t].y); ctx.lineTo(s.trail[t+1].x, s.trail[t+1].y);
        ctx.strokeStyle = s.color; ctx.globalAlpha = (t / s.trail.length) * s.life * 0.5;
        ctx.lineWidth = s.size * 0.5; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
      ctx.fillStyle = s.color; ctx.globalAlpha = s.life; ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const partAssembled = {}, labelShown = {};
  let lastStageLabel = "", rafId = null, needsDraw = false;

  function applyProgress(progress) {
    PARTS.forEach(({ id, from, range, ease, assembleAt }) => {
      const el = partEls[id]; if (!el) return;
      const [start, end] = range;
      const local = clamp01((progress - start) / (end - start));
      const eased = ease(local);
      const [fx, fy, frot, fsx = 1, fsy = 1] = from;
      const sx = lerp(fsx, 1, eased), sy = lerp(fsy, 1, eased);

      // transform
      el.style.transform = `translate(${(fx*(1-eased)).toFixed(2)}px,${(fy*(1-eased)).toFixed(2)}px) rotate(${(frot*(1-eased)).toFixed(2)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;

      // fade in as part travels (starts at 20% opacity when in-flight, reaches 100% on land)
      el.style.opacity = (local < 0.01 ? 0 : lerp(0.15, 1, eased)).toFixed(3);

      const landed = progress >= assembleAt;
      if (landed && !partAssembled[id]) {
        partAssembled[id] = true;
        el.classList.add("arriving", "landed");
        burstSparks(el, 32);
        setTimeout(() => el.classList.remove("arriving"), 600);
        // animate ground shadow more opaque as build completes
        const shadow = document.getElementById("ground-shadow");
        if (shadow) {
          const nLanded = Object.values(partAssembled).filter(Boolean).length;
          const t = nLanded / PARTS.length;
          shadow.setAttribute("fill", `rgba(0,0,0,${(t * 0.45).toFixed(2)})`);
        }
      }
      if (!landed && partAssembled[id]) {
        partAssembled[id] = false;
        el.classList.remove("arriving", "landed");
      }

      const lbl = labelEls[id];
      if (lbl) {
        if (landed && !labelShown[id])  { labelShown[id] = true;  lbl.classList.add("show"); }
        if (!landed && labelShown[id])  { labelShown[id] = false; lbl.classList.remove("show"); }
      }
    });

    if (buildBar) buildBar.style.setProperty("--build-pct", Math.round(clamp01(progress / 0.82) * 100) + "%");
    if (buildLabel) {
      let stageTxt = STAGE_LABELS[0][1];
      for (const [threshold, txt] of STAGE_LABELS) { if (progress >= threshold) stageTxt = txt; }
      if (stageTxt !== lastStageLabel) {
        lastStageLabel = stageTxt; buildLabel.textContent = stageTxt;
        buildLabel.classList.add("active"); setTimeout(() => buildLabel.classList.remove("active"), 600);
      }
    }
    document.documentElement.style.setProperty("--headline-opacity", clamp01((progress - 0.80) / 0.14).toFixed(3));
    document.documentElement.style.setProperty("--hint-opacity", (1 - clamp01(progress / 0.05)).toFixed(3));
  }

  function renderLoop() {
    tickSparks();
    if (sparks.length > 0 || needsDraw) { needsDraw = false; rafId = requestAnimationFrame(renderLoop); }
    else rafId = null;
  }
  function scheduleRender() { if (!rafId) rafId = requestAnimationFrame(renderLoop); }

  if (reduceMotion) {
    applyProgress(1);
    PARTS.forEach(({ id }) => {
      partEls[id]?.classList.add("landed");
      if (partEls[id]) partEls[id].style.opacity = "1";
      labelEls[id]?.classList.add("show");
    });
  } else {
    let ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const rect  = pin.getBoundingClientRect();
        const total = pin.offsetHeight - window.innerHeight;
        applyProgress(clamp01(-rect.top / Math.max(1, total)));
        needsDraw = true; scheduleRender(); ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    // Show the scroll prompt before the build animation begins
  applyProgress(0);
  document.documentElement.style.setProperty("--hint-opacity", "1");
  document.documentElement.style.setProperty("--headline-opacity", "0");
}
})();


// =============================================================================
//  GEAR CANVAS ANIMATION — sponsor hero
// =============================================================================
(function () {
  const canvas = document.getElementById("gear-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let angle = 0;
  let raf;

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function drawGear(cx, cy, outerR, innerR, toothCount, rotation, alpha, glowR, glowG, glowB) {
    const step = (Math.PI * 2) / toothCount;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.globalAlpha = alpha;

    // glow
    const grd = ctx.createRadialGradient(0, 0, innerR * 0.3, 0, 0, outerR * 1.4);
    grd.addColorStop(0, `rgba(${glowR},${glowG},${glowB},0.18)`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(0, 0, outerR * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // teeth path
    ctx.beginPath();
    for (let i = 0; i < toothCount; i++) {
      const a0 = step * i - step * 0.3;
      const a1 = step * i + step * 0.3;
      const a2 = step * i + step * 0.7;
      const a3 = step * (i + 1) - step * 0.3;
      ctx.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
      ctx.lineTo(Math.cos(a0) * outerR, Math.sin(a0) * outerR);
      ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
      ctx.lineTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(${glowR},${glowG},${glowB},0.12)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${glowR},${glowG},${glowB},0.55)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // inner rings
    [0.62, 0.45, 0.28].forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(0, 0, outerR * r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${glowR},${glowG},${glowB},${0.3 - i * 0.08})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // cross spokes
    ctx.strokeStyle = `rgba(${glowR},${glowG},${glowB},0.4)`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * outerR * 0.28, Math.sin(a) * outerR * 0.28);
      ctx.lineTo(Math.cos(a) * outerR * 0.62, Math.sin(a) * outerR * 0.62);
      ctx.stroke();
    }

    // centre dot
    ctx.beginPath();
    ctx.arc(0, 0, outerR * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${glowR},${glowG},${glowB})`;
    ctx.shadowBlur = 18;
    ctx.shadowColor = `rgb(${glowR},${glowG},${glowB})`;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  function tick() {
    if (!canvas.offsetParent && !document.getElementById("sponsors")?.contains(canvas)) {
      raf = requestAnimationFrame(tick);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width  * 0.5;
    const cy = canvas.height * 0.5;
    const base = Math.min(canvas.width, canvas.height) * 0.38;

    // outer large gear (red)
    drawGear(cx, cy, base, base * 0.72, 18, angle, 0.9, 226, 19, 28);

    // inner medium ring (dark)
    drawGear(cx, cy, base * 0.68, base * 0.5, 14, -angle * 1.28, 0.5, 160, 160, 160);

    // small inner gear (red glow)
    drawGear(cx, cy, base * 0.28, base * 0.18, 8, angle * 2, 0.7, 226, 19, 28);

    angle += 0.005;
    raf = requestAnimationFrame(tick);
  }

  tick();
})();
