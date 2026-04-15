/* ============================================================
   Help Rehab Clinic — Frontend JavaScript (v2 — Full Upgrade)
   ============================================================ */

const API_BASE = "/api";

document.addEventListener("DOMContentLoaded", () => {

  // ── Page Loader ──────────────────────────────────────────────
  const loader     = document.getElementById("page-loader");
  const loaderFill = document.getElementById("loader-fill");
  if (loader && loaderFill) {
    loaderFill.style.width = "80%";
    setTimeout(() => {
      loaderFill.style.width = "100%";
      setTimeout(() => loader.classList.add("hidden"), 400);
    }, 700);
  }

  // ── Hero Floating Particles ───────────────────────────────────
  const hero = document.querySelector(".hero");
  if (hero) {
    const particleWrap = document.createElement("div");
    particleWrap.className = "hero-particles";
    hero.appendChild(particleWrap);
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const size = Math.random() * 14 + 4;
      p.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random() * 100}%;
        bottom:${Math.random() * -20}%;
        animation-duration:${Math.random() * 12 + 8}s;
        animation-delay:${Math.random() * 8}s;
        opacity:${Math.random() * 0.5 + 0.1};
      `;
      particleWrap.appendChild(p);
    }
  }

  // ── Button Ripple Effect ──────────────────────────────────────
  document.querySelectorAll(".btn").forEach(btn => {
    btn.addEventListener("click", function(e) {
      const r = document.createElement("span");
      r.className = "ripple";
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
      this.appendChild(r);
      setTimeout(() => r.remove(), 600);
    });
  });

  // ── Year ─────────────────────────────────────────────────────
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Announcement Bar close ───────────────────────────────────
  document.getElementById("announce-close")?.addEventListener("click", () => {
    document.getElementById("announce-bar")?.classList.add("hidden");
    sessionStorage.setItem("announce-closed", "1");
  });
  if (sessionStorage.getItem("announce-closed")) {
    document.getElementById("announce-bar")?.classList.add("hidden");
  }

  // ── Scroll Progress Bar ──────────────────────────────────────
  const progressBar = document.getElementById("scroll-progress");
  function updateProgress() {
    const scrollTop  = window.scrollY;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const pct        = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + "%";
  }

  // ── Navbar scroll ────────────────────────────────────────────
  const header = document.getElementById("site-header");
  const onScroll = () => {
    header?.classList.toggle("scrolled", window.scrollY > 40);
    document.getElementById("back-to-top")?.classList.toggle("visible", window.scrollY > 400);
    updateProgress();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ── Dark Mode Toggle ─────────────────────────────────────────
  const html       = document.documentElement;
  const darkToggle = document.getElementById("dark-toggle");
  const storedTheme = localStorage.getItem("theme") || "light";
  html.setAttribute("data-theme", storedTheme);

  darkToggle?.addEventListener("click", () => {
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });

  // ── Mobile hamburger ─────────────────────────────────────────
  const hamburger = document.getElementById("hamburger");
  const navLinks  = document.getElementById("nav-links");
  hamburger?.addEventListener("click", () => {
    const open = hamburger.classList.toggle("open");
    navLinks?.classList.toggle("open", open);
    hamburger.setAttribute("aria-expanded", open);
  });
  navLinks?.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      hamburger?.classList.remove("open");
      navLinks.classList.remove("open");
    });
  });

  // ── Smooth scroll ────────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
      }
    });
  });

  // ── Back to top ──────────────────────────────────────────────
  document.getElementById("back-to-top")?.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );

  // ── Reveal on scroll ─────────────────────────────────────────
  const io = new IntersectionObserver(entries => {
    entries.forEach(el => { if (el.isIntersecting) { el.target.classList.add("visible"); io.unobserve(el.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  // Also observe left/right/scale variants
  const io2 = new IntersectionObserver(entries => {
    entries.forEach(el => { if (el.isIntersecting) { el.target.classList.add("visible"); io2.unobserve(el.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal-left, .reveal-right, .reveal-scale").forEach(el => io2.observe(el));

  // ── Typewriter on hero title ──────────────────────────────────
  const heroTitle = document.querySelector(".hero-title");
  if (heroTitle) {
    const original = heroTitle.innerHTML;
    const plainText = heroTitle.textContent.trim();
    heroTitle.innerHTML = "";
    const cursor = document.createElement("span");
    cursor.className = "typewriter-cursor";
    let i = 0;
    const type = () => {
      if (i <= plainText.length) {
        heroTitle.textContent = plainText.slice(0, i);
        heroTitle.appendChild(cursor);
        i++;
        setTimeout(type, i === 1 ? 600 : 55);
      } else {
        // restore italic formatting after typing
        setTimeout(() => {
          heroTitle.innerHTML = original;
          cursor.remove();
        }, 400);
      }
    };
    setTimeout(type, 900);
  }

  // ── Stagger doctor cards ──────────────────────────────────────
  document.querySelectorAll(".doctor-card").forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.12}s`;
  });

  // ── Stagger service cards ─────────────────────────────────────
  document.querySelectorAll(".service-card").forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.08}s`;
  });

  // ── Testi card in-view pop ────────────────────────────────────
  const testiIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("in-view");
        testiIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll(".testi-card").forEach(c => testiIO.observe(c));

  // ── Hero slideshow ───────────────────────────────────────────
  const slides = document.querySelectorAll(".hero-slide");
  if (slides.length > 1) {
    let cur = 0;
    setInterval(() => {
      slides[cur].classList.remove("active");
      cur = (cur + 1) % slides.length;
      slides[cur].classList.add("active");
    }, 7000);
  }

  // ── Counter animation ────────────────────────────────────────
  const counterIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el  = entry.target;
      const end = parseInt(el.dataset.count);
      let cur   = 0;
      const step = end / (1800 / 16);
      const tick = () => {
        cur = Math.min(cur + step, end);
        el.textContent = Math.floor(cur).toLocaleString();
        if (cur < end) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterIO.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll(".stat-num[data-count]").forEach(c => counterIO.observe(c));

  // ── Testimonials drag & dots ──────────────────────────────────
  const track  = document.getElementById("testi-track");
  const dotsEl = document.getElementById("testi-dots");
  if (track && dotsEl) {
    const cards = track.querySelectorAll(".testi-card");
    const dots = Array.from({ length: cards.length }, (_, i) => {
      const d = document.createElement("button");
      d.className = "testi-dot" + (i === 0 ? " active" : "");
      d.setAttribute("aria-label", `Review ${i + 1}`);
      d.addEventListener("click", () =>
        cards[i].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
      );
      dotsEl.appendChild(d);
      return d;
    });
    const dotObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = [...cards].indexOf(e.target);
          dots.forEach((d, i) => d.classList.toggle("active", i === idx));
        }
      });
    }, { root: track, threshold: 0.5 });
    cards.forEach(c => dotObs.observe(c));

    let isDown = false, startX = 0, scrollLeft = 0;
    track.addEventListener("mousedown",  e => { isDown = true; startX = e.pageX - track.offsetLeft; scrollLeft = track.scrollLeft; track.style.cursor = "grabbing"; });
    track.addEventListener("mouseleave", ()  => { isDown = false; track.style.cursor = "grab"; });
    track.addEventListener("mouseup",    ()  => { isDown = false; track.style.cursor = "grab"; });
    track.addEventListener("mousemove",  e  => { if (!isDown) return; e.preventDefault(); track.scrollLeft = scrollLeft - (e.pageX - track.offsetLeft - startX) * 1.5; });
  }

  // ── FAQ Accordion ────────────────────────────────────────────
  document.querySelectorAll(".faq-q").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const isOpen = item.classList.contains("open");
      // close all
      document.querySelectorAll(".faq-item.open").forEach(i => {
        i.classList.remove("open");
        i.querySelector(".faq-q").setAttribute("aria-expanded", "false");
      });
      // open clicked if it was closed
      if (!isOpen) {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  // ── Language switcher ────────────────────────────────────────
  const t = {
    en: {
      "hero-badge": "Rehab · Physiotherapy · Psychiatry — Jammu",
      "hero-heading": "Healing you<br><em>back to life</em>",
      "about-title": "Jammu's premier rehabilitation centre",
      "services-title": "Rehabilitation Programs",
      "doctors-title": "Meet Your Care Team",
      "contact-title": "Book an appointment"
    },
    hi: {
      "hero-badge": "रीहैब · फिज़ियोथेरेपी · मनोचिकित्सा — जम्मू",
      "hero-heading": "आपको जिंदगी में<br><em>वापस लाना</em>",
      "about-title": "जम्मू का अग्रणी पुनर्वास केंद्र",
      "services-title": "पुनर्वास प्रोग्राम",
      "doctors-title": "अपनी देखभाल टीम से मिलिए",
      "contact-title": "अपॉइंटमेंट बुक करें"
    },
    pa: {
      "hero-badge": "ਰੀਹੈਬ · ਫਿਜ਼ਿਓਥੈਰੇਪੀ · ਮਨੋਚਿਕਿਤਸਾ — ਜੰਮੂ",
      "hero-heading": "ਤੁਹਾਨੂੰ ਜ਼ਿੰਦਗੀ ਵਿੱਚ<br><em>ਵਾਪਸ ਲਿਆਉਣਾ</em>",
      "about-title": "ਜੰਮੂ ਦਾ ਪ੍ਰਮੁੱਖ ਪੁਨਰਵਾਸ ਕੇਂਦਰ",
      "services-title": "ਰੀਹੈਬਿਲਿਟੇਸ਼ਨ ਪ੍ਰੋਗਰਾਮ",
      "doctors-title": "ਆਪਣੀ ਕੇਅਰ ਟੀਮ ਨੂੰ ਮਿਲੋ",
      "contact-title": "ਅਪੋਇੰਟਮੈਂਟ ਬੁੱਕ ਕਰੋ"
    }
  };
  document.getElementById("lang-sel")?.addEventListener("change", e => {
    const lang = t[e.target.value] || t.en;
    Object.entries(lang).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = val;
    });
  });

  // ── Real-time form validation ────────────────────────────────
  function setHint(fieldId, hintId, type, msg) {
    const field = document.getElementById(fieldId);
    const hint  = document.getElementById(hintId);
    if (!field || !hint) return;
    hint.textContent = msg;
    hint.className   = "field-hint " + (type || "");
    field.classList.toggle("valid",   type === "ok");
    field.classList.toggle("invalid", type === "err");
  }

  document.getElementById("fname")?.addEventListener("blur", function() {
    const v = this.value.trim();
    if (!v) setHint("fname", "hint-name", "err", "Name is required.");
    else if (v.length < 2) setHint("fname", "hint-name", "err", "Too short.");
    else setHint("fname", "hint-name", "ok", "✓ Looks good");
  });

  document.getElementById("femail")?.addEventListener("blur", function() {
    const v = this.value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (!v) setHint("femail", "hint-email", "err", "Email is required.");
    else if (!ok) setHint("femail", "hint-email", "err", "Enter a valid email address.");
    else setHint("femail", "hint-email", "ok", "✓ Valid email");
  });

  document.getElementById("fphone")?.addEventListener("blur", function() {
    const raw = this.value.trim();
    if (!raw) { setHint("fphone", "hint-phone", "", ""); return; }
    const digits = raw.replace(/[\s\-\.]/g, "");
    const normalized = digits.startsWith("+91") ? digits.slice(3)
      : digits.startsWith("91") && digits.length === 12 ? digits.slice(2)
      : digits.startsWith("0") ? digits.slice(1) : digits;
    if (!/^[6-9]\d{9}$/.test(normalized)) setHint("fphone", "hint-phone", "err", "Enter a valid 10-digit Indian mobile number.");
    else setHint("fphone", "hint-phone", "ok", "✓ Valid number");
  });

  document.getElementById("fmessage")?.addEventListener("blur", function() {
    const v = this.value.trim();
    if (!v) setHint("fmessage", "hint-message", "err", "Message is required.");
    else if (v.length < 10) setHint("fmessage", "hint-message", "err", "Please write at least a few words.");
    else setHint("fmessage", "hint-message", "ok", `✓ ${v.length} characters`);
  });

  // Set min date for appointment date picker to today
  const dateInput = document.getElementById("fdate");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.setAttribute("min", today);
  }

  // ── Contact form → POST /api/inquiries ───────────────────────
  const form      = document.getElementById("contact-form");
  const statusEl  = document.getElementById("form-status");
  const submitBtn = document.getElementById("submit-btn");

  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.name?.trim() || !data.email?.trim() || !data.message?.trim()) {
      showStatus("error", "Please fill in Name, Email and Message.");
      return;
    }

    if (data.phone?.trim()) {
      const digits     = data.phone.trim().replace(/[\s\-\.]/g, "");
      const normalized = digits.startsWith("+91") ? digits.slice(3)
        : digits.startsWith("91") && digits.length === 12 ? digits.slice(2)
        : digits.startsWith("0") ? digits.slice(1) : digits;
      if (!/^[6-9]\d{9}$/.test(normalized)) {
        showStatus("error", normalized.length !== 10
          ? `Invalid phone number — must be exactly 10 digits (you entered ${normalized.length}).`
          : "Invalid phone number — Indian mobile numbers must start with 6, 7, 8, or 9."
        );
        return;
      }
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Sending…';
    statusEl.className  = "form-status";
    statusEl.textContent = "";

    try {
      const res  = await fetch(`${API_BASE}/inquiries`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.errors?.[0]?.msg || json.error || "Submission failed.");
      showStatus("success", "✓ Thank you! We'll contact you within 24 hours to confirm your appointment.");
      form.reset();
      // clear all hints
      document.querySelectorAll(".field-hint").forEach(h => { h.textContent = ""; h.className = "field-hint"; });
      document.querySelectorAll(".form-group input, .form-group textarea").forEach(f => f.classList.remove("valid", "invalid"));
    } catch (err) {
      showStatus("error", err.message || "Failed to submit. Please call us directly.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Send Inquiry</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    }
  });

  function showStatus(type, msg) {
    if (!statusEl) return;
    statusEl.className   = `form-status ${type}`;
    statusEl.textContent = msg;
    statusEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ── Cookie Notice ────────────────────────────────────────────
  const cookieNotice = document.getElementById("cookie-notice");
  if (cookieNotice && !localStorage.getItem("cookie-consent")) {
    setTimeout(() => cookieNotice.classList.add("show"), 2000);
    document.getElementById("cookie-accept")?.addEventListener("click", () => {
      localStorage.setItem("cookie-consent", "accepted");
      cookieNotice.classList.add("hide");
    });
    document.getElementById("cookie-decline")?.addEventListener("click", () => {
      localStorage.setItem("cookie-consent", "declined");
      cookieNotice.classList.add("hide");
    });
  }

  // ── Sticky CTA — hide when contact section visible ───────────
  const stickyCta    = document.getElementById("sticky-cta");
  const contactSec   = document.getElementById("contact");
  if (stickyCta && contactSec) {
    const stickyIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        stickyCta.style.opacity      = e.isIntersecting ? "0" : "1";
        stickyCta.style.pointerEvents = e.isIntersecting ? "none" : "";
      });
    }, { threshold: 0.2 });
    stickyIO.observe(contactSec);
  }

});
