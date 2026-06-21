// @ts-check

// Tiny progressive-enhancement helpers. No dependencies.

// Footer year
/** @type {HTMLElement | null} */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Copy-to-clipboard for the install command
/** @type {HTMLElement | null} */
const copyStatus = document.getElementById("copy-status");
const setCopyStatus = (message) => {
  if (copyStatus) copyStatus.textContent = message;
};

document.querySelectorAll(".copy-btn").forEach((buttonEl) => {
  const button = /** @type {HTMLButtonElement} */ (buttonEl);

  button.addEventListener("click", async () => {
    const text = button.getAttribute("data-copy") || "";
    if (!navigator.clipboard) {
      setCopyStatus("Clipboard unavailable. Select the install command manually.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      button.classList.add("copied");
      button.setAttribute("aria-label", "Copied install command");
      setCopyStatus("Install command copied.");
      setTimeout(() => {
        button.classList.remove("copied");
        button.setAttribute("aria-label", "Copy install command");
        setCopyStatus("");
      }, 1500);
    } catch (error) {
      console.warn("Unable to copy install command.", error);
      setCopyStatus("Copy failed. Select the install command manually.");
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
/**
 * @typedef {Object} Augmentation
 * @property {string} label
 * @property {string} code
 * @property {string} desc
 * @property {string} before
 * @property {string} after
 */

/** @type {Record<string, Augmentation>} */
const augData = {
  motion: {
    label: "motion",
    code: "tio.Motion()",
    desc: "Simulates patient motion during acquisition, adding blurring and ghosting from inconsistent k-space lines.",
    before: "assets/aug/motion_before.webp",
    after: "assets/aug/motion_after.webp",
  },
  ghosting: {
    label: "ghosting",
    code: "tio.Ghosting()",
    desc: "Reproduces the ghost copies caused by periodic motion such as breathing or pulsatile flow.",
    before: "assets/aug/ghosting_before.webp",
    after: "assets/aug/ghosting_after.webp",
  },
  spike: {
    label: "spike",
    code: "tio.Spike()",
    desc: "Adds herringbone artifacts produced by spikes (outliers) in k-space.",
    before: "assets/aug/spike_before.webp",
    after: "assets/aug/spike_after.webp",
  },
  bias: {
    label: "bias field",
    code: "tio.BiasField()",
    desc: "Applies a smooth, low-frequency intensity inhomogeneity, as caused by MRI coil sensitivity.",
    before: "assets/aug/bias_before.webp",
    after: "assets/aug/bias_after.webp",
  },
  noise: {
    label: "noise",
    code: "tio.Noise()",
    desc: "Adds Gaussian noise to the image, simulating a lower signal-to-noise ratio.",
    before: "assets/aug/noise_before.webp",
    after: "assets/aug/noise_after.webp",
  },
  elastic: {
    label: "elastic deformation",
    code: "tio.ElasticDeformation()",
    desc: "Warps the scan with a smooth random displacement field for realistic anatomical variation.",
    before: "assets/aug/elastic_before.webp",
    after: "assets/aug/elastic_after.webp",
  },
};

const augSlider = /** @type {HTMLElement | null} */ (
  document.getElementById("aug-slider")
);
const augBefore = /** @type {HTMLImageElement | null} */ (
  document.getElementById("aug-before")
);
const augAfter = /** @type {HTMLImageElement | null} */ (
  document.getElementById("aug-after")
);
const augRange = /** @type {HTMLInputElement | null} */ (
  document.getElementById("aug-range")
);
const augCode = /** @type {HTMLElement | null} */ (
  document.getElementById("aug-code")
);
const augDesc = /** @type {HTMLElement | null} */ (
  document.getElementById("aug-desc")
);
const augTabs = /** @type {NodeListOf<HTMLButtonElement>} */ (
  document.querySelectorAll(".aug-tab")
);

if (augSlider && augBefore && augAfter && augRange && augCode && augDesc) {
  const setPos = (value) => {
    const v = Math.max(0, Math.min(100, value));
    augSlider.style.setProperty("--pos", `${v}%`);
    augRange.value = String(v);
  };

  // Mouse hovers to reveal; touch drags to reveal (pointermove fires while
  // touching). No click needed. Capturing the pointer on press keeps a
  // click-drag (or touch drag) tracking even if it strays outside the slider.
  const update = (event) => {
    const rect = augSlider.getBoundingClientRect();
    setPos(((event.clientX - rect.left) / rect.width) * 100);
  };
  augSlider.addEventListener("pointermove", update);
  augSlider.addEventListener("pointerdown", (event) => {
    try {
      augSlider.setPointerCapture(event.pointerId);
    } catch {
      /* setPointerCapture unsupported or pointer gone; ignore */
    }
    update(event);
  });
  const release = (event) => {
    try {
      augSlider.releasePointerCapture(event.pointerId);
    } catch {
      /* nothing to release; ignore */
    }
  };
  augSlider.addEventListener("pointerup", release);
  augSlider.addEventListener("pointercancel", release);
  augRange.addEventListener("input", () => setPos(Number(augRange.value)));

  augTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const key = tab.dataset.aug;
      const data = augData[key];
      if (!data) {
        console.warn(`Unknown augmentation key: ${key}`);
        return;
      }

      augTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-pressed", active ? "true" : "false");
      });

      augCode.textContent = data.code;
      augDesc.textContent = data.desc;
      augBefore.src = data.before;
      augAfter.src = data.after;
      augBefore.alt = `Original brain scan before ${data.label} augmentation`;
      augAfter.alt = `Brain scan after ${data.label} augmentation`;
      setPos(50);
    });
  });
}
