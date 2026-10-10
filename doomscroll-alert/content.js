(function () {
  // ================= PENGATURAN PER SITUS =================
  // limit = batas scroll. Alert muncul saat scroll ke-(limit + 1).
  const SITES = [
    {
      name: "YouTube Shorts",
      unit: "video Shorts",
      limit: 3,
      match: (h) => h.endsWith("youtube.com"),
      getKey: ytKey,
    },
    {
      name: "TikTok",
      unit: "video TikTok",
      limit: 3,
      match: (h) => h.endsWith("tiktok.com"),
      getKey: tiktokKey,
    },
    {
      name: "X (Twitter)",
      unit: "postingan",
      limit: 20, // timeline X isinya banyak, jadi batasnya lebih longgar
      unique: true, // scroll balik ke atas tidak dihitung ulang
      match: (h) =>
        h === "x.com" || h.endsWith(".x.com") ||
        h === "twitter.com" || h.endsWith(".twitter.com"),
      getKey: xKey,
    },
  ];
  // ========================================================

  const site = SITES.find((s) => s.match(location.hostname));
  if (!site) return;

  // ---------- Helper ----------
  const ids = new WeakMap();
  let idCounter = 0;
  function elId(el) {
    if (!ids.has(el)) ids.set(el, ++idCounter);
    return ids.get(el);
  }

  // Mengembalikan:
  //   string    -> item yang sedang tampil
  //   null      -> bukan di area scroll (reset hitungan)
  //   undefined -> belum bisa dideteksi (abaikan dulu)

  // YouTube: URL berubah tiap pindah Shorts (/shorts/<id>)
  function ytKey() {
    const m = location.pathname.match(/^\/shorts\/([\w-]+)/);
    return m ? m[1] : null;
  }

  // TikTok: URL feed tidak berubah, jadi pakai video yang paling dominan di layar
  function tiktokKey() {
    const vh = window.innerHeight;
    let best = null;
    let bestVisible = 0;
    for (const v of document.querySelectorAll("video")) {
      const r = v.getBoundingClientRect();
      const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (visible > bestVisible) {
        bestVisible = visible;
        best = v;
      }
    }
    if (!best || bestVisible < vh * 0.5) return undefined;
    const src = best.currentSrc || best.src;
    if (!src) return undefined;
    return elId(best) + "|" + src;
  }

  // X: postingan yang sedang melewati garis tengah layar
  function xKey() {
    const mid = window.innerHeight / 2;
    for (const a of document.querySelectorAll('article[data-testid="tweet"]')) {
      const r = a.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) {
        const link = a.querySelector('a[href*="/status/"] time')?.closest("a");
        return link ? link.getAttribute("href") : "el" + elId(a);
      }
    }
    return undefined;
  }

  // ---------- Mesin penghitung ----------
  let lastKey = null;
  let count = 0;
  let misses = 0;
  const seen = new Set();

  function reset() {
    lastKey = null;
    count = 0;
    misses = 0;
    seen.clear();
  }

  function showAlert() {
    // Pause video dulu supaya suara tidak terus jalan saat alert tampil
    document.querySelectorAll("video").forEach((v) => v.pause());
    setTimeout(() => {
      alert(
        `⚠️ Kamu sudah scroll lebih dari ${site.limit} ${site.unit} di ${site.name}!\n\nSaatnya berhenti dan istirahat.`
      );
    }, 100);
  }

  function check() {
    const key = site.getKey();

    if (key === null) {
      reset();
      return;
    }
    if (key === undefined) {
      // Tidak terdeteksi cukup lama (~5 detik) = dianggap sudah pergi dari feed
      if (++misses > 10) reset();
      return;
    }
    misses = 0;

    // Item pertama yang terlihat belum dihitung sebagai scroll
    if (lastKey === null) {
      lastKey = key;
      if (site.unique) seen.add(key);
      return;
    }

    if (key === lastKey) return;
    lastKey = key;

    if (site.unique) {
      if (seen.has(key)) return;
      seen.add(key);
    }

    count++;
    if (count > site.limit) {
      count = 0; // alert muncul lagi setelah {limit} scroll berikutnya
      showAlert();
    }
  }

  // YouTube adalah SPA, jadi pantau perubahan URL; situs lain cukup polling
  document.addEventListener("yt-navigate-finish", check);
  setInterval(check, 500);
  check();
})();
