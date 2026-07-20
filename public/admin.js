const loginView = document.getElementById("loginView");
const adminShell = document.getElementById("adminShell");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");
const playersBody = document.getElementById("playersBody");
const tableState = document.getElementById("tableState");
const playerCount = document.getElementById("playerCount");
const searchInput = document.getElementById("searchInput");
const refreshButton = document.getElementById("refreshButton");
const createButton = document.getElementById("createButton");
const playerDialog = document.getElementById("playerDialog");
const playerForm = document.getElementById("playerForm");
const playerFormMessage = document.getElementById("playerFormMessage");
const savePlayerButton = document.getElementById("savePlayerButton");
const deleteDialog = document.getElementById("deleteDialog");
const deleteDescription = document.getElementById("deleteDescription");
const confirmDeleteButton = document.getElementById("confirmDeleteButton");
const toast = document.getElementById("toast");

const DEFAULT_SKIN_ID = "default_horse";
const SKIN_CATALOG = [
  { id: DEFAULT_SKIN_ID, name: "Default Horse", description: "Skin mặc định" },
  { id: "gundam_unicorn", name: "Gundam Unicorn", description: "Unicorn mobile suit" },
  { id: "odin_transformer", name: "Odin", description: "Biến hình khi di chuyển" },
  { id: "arya", name: "Arya", description: "Nhân vật với chuyển động đi bộ" },
];

const fields = {
  username: document.getElementById("playerUsername"),
  displayName: document.getElementById("playerDisplayName"),
  password: document.getElementById("playerPassword"),
  coins: document.getElementById("playerCoins"),
  ownedSkinIds: document.getElementById("playerOwnedSkins"),
  equippedSkinId: document.getElementById("playerEquippedSkin"),
};

const state = {
  editingId: null,
  deletingId: null,
  players: [],
  searchTimer: null,
};

function skinDetails(skinId) {
  return SKIN_CATALOG.find((skin) => skin.id === skinId) || {
    id: skinId,
    name: skinId,
    description: "Skin từ dữ liệu hiện tại",
  };
}

function selectedSkinIds() {
  return Array.from(fields.ownedSkinIds.querySelectorAll('input[type="checkbox"]'))
    .filter((input) => input.checked)
    .map((input) => input.value);
}

function syncEquippedSkinOptions(preferredSkinId = fields.equippedSkinId.value) {
  const ownedSkinIds = selectedSkinIds();
  fields.equippedSkinId.replaceChildren();

  ownedSkinIds.forEach((skinId) => {
    const skin = skinDetails(skinId);
    const option = document.createElement("option");
    option.value = skin.id;
    option.textContent = skin.name;
    fields.equippedSkinId.append(option);
  });

  fields.equippedSkinId.value = ownedSkinIds.includes(preferredSkinId)
    ? preferredSkinId
    : DEFAULT_SKIN_ID;
}

function renderSkinOptions(selectedIds = [DEFAULT_SKIN_ID]) {
  const selected = new Set([DEFAULT_SKIN_ID, ...selectedIds]);
  const catalog = [...SKIN_CATALOG];

  selected.forEach((skinId) => {
    if (!catalog.some((skin) => skin.id === skinId)) {
      catalog.push(skinDetails(skinId));
    }
  });

  fields.ownedSkinIds.replaceChildren();
  catalog.forEach((skin) => {
    const option = document.createElement("label");
    option.className = "skin-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "ownedSkinIds";
    checkbox.value = skin.id;
    checkbox.checked = selected.has(skin.id);
    checkbox.disabled = skin.id === DEFAULT_SKIN_ID;
    checkbox.addEventListener("change", () => syncEquippedSkinOptions());

    const copy = document.createElement("span");
    const name = document.createElement("strong");
    const description = document.createElement("small");
    name.textContent = skin.name;
    description.textContent = skin.description;
    copy.append(name, description);
    option.append(checkbox, copy);
    fields.ownedSkinIds.append(option);
  });
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && url !== "/api/admin/login") {
    showLogin("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || `Yêu cầu thất bại (${response.status}).`);
  }
  return data;
}

function setMessage(element, message, type = "error") {
  element.textContent = message || "";
  element.dataset.type = message ? type : "";
}

function showToast(message, type = "success") {
  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function showLogin(message = "") {
  adminShell.hidden = true;
  loginView.hidden = false;
  setMessage(loginMessage, message);
  document.getElementById("adminPassword").focus();
}

function showAdmin() {
  loginView.hidden = true;
  adminShell.hidden = false;
  setMessage(loginMessage, "");
}

function formatDate(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không hợp lệ";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function addCell(row, label, content, className = "") {
  const cell = document.createElement("td");
  cell.dataset.label = label;
  if (className) cell.className = className;
  if (content instanceof Node) cell.append(content);
  else cell.textContent = content;
  row.append(cell);
  return cell;
}

function makePlayerIdentity(player) {
  const wrapper = document.createElement("div");
  wrapper.className = "player-identity";
  const avatar = document.createElement("span");
  avatar.className = "player-avatar";
  avatar.textContent = (player.displayName || player.username || "?").slice(0, 1).toUpperCase();
  const text = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = player.displayName || player.username;
  const username = document.createElement("span");
  username.textContent = `@${player.username}`;
  text.append(name, username);
  wrapper.append(avatar, text);
  return wrapper;
}

function makeActions(player) {
  const actions = document.createElement("div");
  actions.className = "row-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "table-action";
  editButton.textContent = "Sửa";
  editButton.addEventListener("click", () => openEditor(player));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "table-action danger";
  deleteButton.textContent = "Xóa";
  deleteButton.addEventListener("click", () => openDelete(player));

  actions.append(editButton, deleteButton);
  return actions;
}

function renderPlayers() {
  playersBody.replaceChildren();
  tableState.hidden = state.players.length > 0;
  playerCount.textContent = `${state.players.length} tài khoản được hiển thị`;

  if (state.players.length === 0) {
    tableState.className = "table-state empty";
    tableState.textContent = searchInput.value.trim()
      ? "Không tìm thấy tài khoản phù hợp."
      : "Chưa có tài khoản người chơi.";
    return;
  }

  state.players.forEach((player, index) => {
    const row = document.createElement("tr");
    row.style.setProperty("--row-index", index);
    addCell(row, "Người chơi", makePlayerIdentity(player));
    addCell(row, "Xu", Number(player.coins || 0).toLocaleString("vi-VN"), "mono");
    addCell(row, "Skin", skinDetails(player.equippedSkinId || DEFAULT_SKIN_ID).name, "skin-cell");
    addCell(row, "Ngày tạo", formatDate(player.createdAtUtc));
    addCell(row, "Thao tác", makeActions(player), "actions-cell");
    playersBody.append(row);
  });
}

function renderLoading() {
  playersBody.replaceChildren();
  tableState.hidden = false;
  tableState.className = "table-state loading";
  tableState.textContent = "Đang tải dữ liệu người chơi...";
  playerCount.textContent = "Đang đồng bộ với MongoDB";
}

async function loadPlayers() {
  renderLoading();
  try {
    const query = encodeURIComponent(searchInput.value.trim());
    const data = await request(`/api/admin/players?q=${query}`);
    state.players = data.players || [];
    renderPlayers();
  } catch (error) {
    tableState.hidden = false;
    tableState.className = "table-state error";
    tableState.textContent = error.message;
    playerCount.textContent = "Không tải được dữ liệu";
  }
}

function openEditor(player = null) {
  state.editingId = player ? player._id : null;
  playerForm.reset();
  fields.coins.value = player ? player.coins ?? 0 : 1000;
  fields.username.value = player ? player.username || "" : "";
  fields.displayName.value = player ? player.displayName || "" : "";
  fields.password.value = "";
  const equippedSkinId = player ? player.equippedSkinId || DEFAULT_SKIN_ID : DEFAULT_SKIN_ID;
  const ownedSkinIds = player ? [...(player.ownedSkinIds || [])] : [DEFAULT_SKIN_ID];
  if (!ownedSkinIds.includes(equippedSkinId)) ownedSkinIds.push(equippedSkinId);
  renderSkinOptions(ownedSkinIds);
  syncEquippedSkinOptions(equippedSkinId);
  fields.password.required = !player;
  document.getElementById("formMode").textContent = player ? "Cập nhật" : "Tạo mới";
  document.getElementById("formTitle").textContent = player ? `Sửa @${player.username}` : "Tạo tài khoản";
  document.getElementById("passwordHint").textContent = player ? "để trống nếu không đổi" : "ít nhất 6 ký tự";
  setMessage(playerFormMessage, "");
  playerDialog.showModal();
  fields.username.focus();
}

function closeEditor() {
  playerDialog.close();
  state.editingId = null;
}

function playerPayload() {
  const payload = {
    username: fields.username.value,
    displayName: fields.displayName.value,
    coins: Number(fields.coins.value),
    ownedSkinIds: selectedSkinIds(),
    equippedSkinId: fields.equippedSkinId.value,
  };
  if (fields.password.value) payload.password = fields.password.value;
  return payload;
}

async function savePlayer(event) {
  event.preventDefault();
  if (!playerForm.reportValidity()) return;
  savePlayerButton.disabled = true;
  setMessage(playerFormMessage, "Đang lưu...", "info");

  try {
    const url = state.editingId
      ? `/api/admin/players/${state.editingId}`
      : "/api/admin/players";
    await request(url, {
      method: state.editingId ? "PATCH" : "POST",
      body: JSON.stringify(playerPayload()),
    });
    const message = state.editingId ? "Đã cập nhật tài khoản." : "Đã tạo tài khoản mới.";
    closeEditor();
    showToast(message);
    await loadPlayers();
  } catch (error) {
    setMessage(playerFormMessage, error.message);
  } finally {
    savePlayerButton.disabled = false;
  }
}

function openDelete(player) {
  state.deletingId = player._id;
  deleteDescription.textContent = `Tài khoản @${player.username} sẽ bị xóa vĩnh viễn khỏi database.`;
  deleteDialog.showModal();
}

async function deletePlayer() {
  if (!state.deletingId) return;
  confirmDeleteButton.disabled = true;
  try {
    await request(`/api/admin/players/${state.deletingId}`, { method: "DELETE" });
    deleteDialog.close();
    state.deletingId = null;
    showToast("Đã xóa tài khoản.");
    await loadPlayers();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    confirmDeleteButton.disabled = false;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;
  loginButton.disabled = true;
  setMessage(loginMessage, "Đang xác thực...", "info");
  try {
    await request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: document.getElementById("adminPassword").value }),
    });
    loginForm.reset();
    showAdmin();
    await loadPlayers();
  } catch (error) {
    setMessage(loginMessage, error.message);
  } finally {
    loginButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  await request("/api/admin/logout", { method: "POST", body: "{}" }).catch(() => {});
  state.players = [];
  showLogin();
});

createButton.addEventListener("click", () => openEditor());
refreshButton.addEventListener("click", loadPlayers);
playerForm.addEventListener("submit", savePlayer);
document.getElementById("closeDialogButton").addEventListener("click", closeEditor);
document.getElementById("cancelDialogButton").addEventListener("click", closeEditor);
document.getElementById("cancelDeleteButton").addEventListener("click", () => deleteDialog.close());
confirmDeleteButton.addEventListener("click", deletePlayer);

searchInput.addEventListener("input", () => {
  window.clearTimeout(state.searchTimer);
  state.searchTimer = window.setTimeout(loadPlayers, 260);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && playerDialog.open) closeEditor();
});

request("/api/admin/session")
  .then(() => {
    showAdmin();
    return loadPlayers();
  })
  .catch(() => showLogin());
