// Tiny progressive-enhancement helpers. No dependencies.

// Footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Copy-to-clipboard for the install command
document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const text = btn.getAttribute("data-copy") || "";
    try {
      await navigator.clipboard.writeText(text);
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 1500);
    } catch {
      /* clipboard unavailable, ignore */
    }
  });
});

// Reveal elements on scroll
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("in"));
}

// Interactive MRI augmentations showcase
const augData = {
  motion: {
    code: "tio.Motion()",
    desc: "Simulates patient motion during acquisition, adding blurring and ghosting from inconsistent k-space lines.",
  },
  ghosting: {
    code: "tio.Ghosting()",
    desc: "Reproduces the ghost copies caused by periodic motion such as breathing or pulsatile flow.",
  },
  spike: {
    code: "tio.Spike()",
    desc: "Adds herringbone artifacts produced by spikes (outliers) in k-space.",
  },
  bias: {
    code: "tio.BiasField()",
    desc: "Applies a smooth, low-frequency intensity inhomogeneity, as caused by MRI coil sensitivity.",
  },
  noise: {
    code: "tio.Noise()",
    desc: "Adds Gaussian noise to the image, simulating a lower signal-to-noise ratio.",
  },
  elastic: {
    code: "tio.ElasticDeformation()",
    desc: "Warps the scan with a smooth random displacement field for realistic anatomical variation.",
  },
};

const augVideo = document.getElementById("aug-video");
const augSource = document.getElementById("aug-source");
const augCode = document.getElementById("aug-code");
const augDesc = document.getElementById("aug-desc");
const augTabs = document.querySelectorAll(".aug-tab");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

if (augVideo && prefersReducedMotion) {
  augVideo.removeAttribute("autoplay");
  augVideo.setAttribute("controls", "");
}

augTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const key = tab.dataset.aug;
    const data = augData[key];
    if (!data || !augVideo) return;

    augTabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });

    augCode.textContent = data.code;
    augDesc.textContent = data.desc;
    augVideo.poster = `assets/video/${key}.jpg`;
    augSource.src = `assets/video/${key}.mp4`;
    augVideo.load();
    if (!prefersReducedMotion) {
      const playback = augVideo.play();
      if (playback && playback.catch) playback.catch(() => {});
    }
  });
});
