/* ════════════════════════════════════════
   app.js – Cờ Cá Ngựa 3D
   ════════════════════════════════════════ */
import * as THREE from "three";

/* ── DOM refs ────────────────────────────── */
const healthDot = document.getElementById("healthDot");
const healthTitle = document.getElementById("healthTitle");
const healthText = document.getElementById("healthText");
const registerForm = document.getElementById("registerForm");
const registerButton = document.getElementById("registerButton");
const registerMessage = document.getElementById("registerMessage");
const themeToggle = document.getElementById("themeToggle");

/* ─────────────────────────────────────────
   Light / Dark Mode
───────────────────────────────────────── */
const THEME_KEY = "cocangua-theme";

function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

applyTheme(getPreferredTheme());
themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
  if (!localStorage.getItem(THEME_KEY)) applyTheme(e.matches ? "dark" : "light");
});

/* ─────────────────────────────────────────
   Message translation
───────────────────────────────────────── */
const MSG = {
  "Register success. You can now log in from the game exe.": "Đăng ký thành công! Bạn có thể đăng nhập vào game.",
  "Username already exists.": "Tên tài khoản đã tồn tại.",
  "Username is required.": "Vui lòng nhập tên tài khoản.",
  "Password is required.": "Vui lòng nhập mật khẩu.",
  "Username must be at least 3 characters.": "Tên tài khoản phải có ít nhất 3 ký tự.",
  "Password must be at least 6 characters.": "Mật khẩu phải có ít nhất 6 ký tự.",
  "Server error.": "Lỗi máy chủ, vui lòng thử lại sau.",
  "API endpoint not found.": "Không tìm thấy địa chỉ API.",
};

const tr = msg => MSG[msg] || msg || "";

function setMsg(el, text, ok) {
  el.textContent = tr(text);
  el.className = "msg" + (text ? (ok ? " ok" : " bad") : "");
}

/* ─────────────────────────────────────────
   Fetch helper
───────────────────────────────────────── */
async function api(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.message || `Lỗi ${res.status}`);
  return data;
}

/* ─────────────────────────────────────────
   Health check
───────────────────────────────────────── */
async function checkHealth() {
  try {
    const d = await api("/api/health");
    healthDot.className = "dot ok";
    healthTitle.textContent = "Máy chủ sẵn sàng";
    healthText.textContent = `${d.database} · ${d.playersCollection}`;
  } catch (e) {
    healthDot.className = "dot bad";
    healthTitle.textContent = "Không kết nối được";
    healthText.textContent = tr(e.message);
  }
}

/* ─────────────────────────────────────────
   Register form
───────────────────────────────────────── */
registerForm.addEventListener("submit", async e => {
  e.preventDefault();
  registerButton.disabled = true;
  setMsg(registerMessage, "Đang tạo tài khoản…", true);
  try {
    const data = await api("/api/register", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(registerForm))) });
    registerForm.reset();
    setMsg(registerMessage, data.message, true);
  } catch (err) {
    setMsg(registerMessage, err.message, false);
  } finally {
    registerButton.disabled = false;
  }
});

/* ═════════════════════════════════════════
   3D Dice (viên xúc xắc) – Three.js
   ═════════════════════════════════════════ */
function makePipTexture(pips) {
  const size = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");

  // Face background
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  ctx.fillStyle = isDark ? "#2a2520" : "#ffffff";
  ctx.beginPath();
  ctx.roundRect(4, 4, size - 8, size - 8, 30);
  ctx.fill();

  // Border
  ctx.strokeStyle = isDark ? "#c9a84c" : "#5c3d1e";
  ctx.lineWidth = 6;
  ctx.stroke();

  // Pip positions for 1–6
  const PIP_LAYOUTS = {
    1: [[.5, .5]],
    2: [[.25, .25], [.75, .75]],
    3: [[.25, .25], [.5, .5], [.75, .75]],
    4: [[.25, .25], [.75, .25], [.25, .75], [.75, .75]],
    5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]],
    6: [[.25, .2], [.75, .2], [.25, .5], [.75, .5], [.25, .8], [.75, .8]],
  };

  const layout = PIP_LAYOUTS[pips] || PIP_LAYOUTS[1];
  const pipColor = isDark ? "#c9a84c" : "#5c3d1e";
  const r = size * 0.09;

  layout.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx * size, cy * size, r, 0, Math.PI * 2);
    ctx.fillStyle = pipColor;
    ctx.fill();
  });

  return new THREE.CanvasTexture(cv);
}

function createDice(canvas) {
  const SIZE = 120;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(SIZE, SIZE);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 3.2);

  // Lights
  const amb = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(3, 4, 5);
  scene.add(dir);
  const rim = new THREE.DirectionalLight(0xc9a84c, 0.4);
  rim.position.set(-3, -2, -3);
  scene.add(rim);

  const facePips = [2, 5, 1, 6, 3, 4];
  const materials = facePips.map(p => new THREE.MeshStandardMaterial({
    map: makePipTexture(p),
    roughness: 0.3,
    metalness: 0.1,
  }));

  const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  const mesh = new THREE.Mesh(geo, materials);
  scene.add(mesh);

  /* ── State ── */
  let everDragged = false;   // đã từng kéo chưa
  let autoT = 0;             // bộ đếm auto-spin ban đầu
  let velX = 0, velY = 0;   // inertia sau khi thả
  let isDragging = false;
  let lastX = 0, lastY = 0;

  /* ── Mouse drag ── */
  canvas.addEventListener("mousedown", e => {
    isDragging = true;
    everDragged = true;
    lastX = e.clientX; lastY = e.clientY;
    velX = 0; velY = 0;
    canvas.style.cursor = "grabbing";
    e.preventDefault();
  });
  window.addEventListener("mousemove", e => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    velY = dx * 0.014;
    velX = dy * 0.014;
    mesh.rotation.y += velY;
    mesh.rotation.x += velX;
    lastX = e.clientX; lastY = e.clientY;
  });
  window.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    canvas.style.cursor = "grab";
  });

  /* ── Touch drag ── */
  canvas.addEventListener("touchstart", e => {
    isDragging = true;
    everDragged = true;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    velX = 0; velY = 0;
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener("touchmove", e => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - lastX;
    const dy = e.touches[0].clientY - lastY;
    velY = dx * 0.014;
    velX = dy * 0.014;
    mesh.rotation.y += velY;
    mesh.rotation.x += velX;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener("touchend", () => { isDragging = false; });

  /* ── Hover cursor ── */
  canvas.addEventListener("mouseenter", () => { if (!isDragging) canvas.style.cursor = "grab"; });
  canvas.addEventListener("mouseleave", () => { canvas.style.cursor = "default"; });

  /* ── Render loop ── */
  function animate() {
    requestAnimationFrame(animate);

    if (isDragging) {
      // user đang kéo — không làm gì thêm
    } else if (everDragged) {
      // Đã kéo ít nhất 1 lần → chỉ áp dụng inertia, không auto-spin
      if (Math.abs(velX) > 0.0001 || Math.abs(velY) > 0.0001) {
        mesh.rotation.x += velX;
        mesh.rotation.y += velY;
        velX *= 0.92;
        velY *= 0.92;
      }
      // Khi vel gần 0 → dice đứng yên mãi
    } else {
      // Chưa ai tương tác → auto-spin nhẹ ban đầu
      autoT += 0.008;
      mesh.rotation.x = autoT * 0.7;
      mesh.rotation.y = autoT;
    }

    renderer.render(scene, camera);
  }
  animate();

  /* ── Rebuild textures khi đổi theme ── */
  const observer = new MutationObserver(() => {
    facePips.forEach((p, i) => {
      materials[i].map.dispose();
      materials[i].map = makePipTexture(p);
      materials[i].needsUpdate = true;
    });
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

// Init dice – 1 viên duy nhất ở góc trên phải
createDice(document.getElementById("diceCanvas"), 0);

/* ── Init ────────────────────────────────── */
checkHealth();

