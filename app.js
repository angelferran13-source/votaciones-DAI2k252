// =====================================
// CONFIG
// =====================================
const MAX_VOTERS = 48;
const ADMIN_PIN = "9275"; // cambia esto si quieres

// =====================================
// ESTADO
// =====================================
let votes = {};
let currentCategoryId = null;
let currentNominationId = null;
let isAdmin = false;

// =====================================
// DOM (SE ASIGNA EN DOMContentLoaded)
// =====================================
let categoryList, nominationSelect, categoryTitle, nomineesContainer;
let regBackdrop, regFirstname, regLastname, regCedula, regSave, regError;

// =====================================
// DEVICE ID
// =====================================
const DEVICE_ID_KEY = "device_id_v1";
let DEVICE_ID = localStorage.getItem(DEVICE_ID_KEY);
if (!DEVICE_ID) {
  DEVICE_ID =
    "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem(DEVICE_ID_KEY, DEVICE_ID);
}

// Perfil local
const DEVICE_PROFILE_KEY = "device_profile_v1";
let DEVICE_PROFILE = null;
try {
  DEVICE_PROFILE = JSON.parse(localStorage.getItem(DEVICE_PROFILE_KEY) || "null");
} catch {
  DEVICE_PROFILE = null;
}

// Mapa participantes (data.js)
const participantsById = {};
participants.forEach((p) => (participantsById[p.id] = p));

// =====================================
// UTIL
// =====================================
function norm(s) {
  return String(s || "").trim();
}
function fmtDate(ts) {
  return ts ? new Date(ts).toLocaleString() : "";
}

function showBanner(msg) {
  const el = document.getElementById("all-voted-message");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}
function hideBanner() {
  const el = document.getElementById("all-voted-message");
  if (!el) return;
  el.style.display = "none";
}

// =====================================
// MODAL REGISTRO
// =====================================
function showRegModal() {
  if (!regBackdrop) return;
  regError.textContent = "";
  regBackdrop.style.display = "flex";
  regBackdrop.setAttribute("aria-hidden", "false");
}
function hideRegModal() {
  if (!regBackdrop) return;
  regBackdrop.style.display = "none";
  regBackdrop.setAttribute("aria-hidden", "true");
}

// =====================================
// ADMIN
// =====================================
function ensureAdmin() {
  if (isAdmin) return true;
  const pin = prompt("PIN de administrador:");
  if (pin === ADMIN_PIN) {
    isAdmin = true;
    const panel = document.getElementById("admin-panel");
    const dashes = document.getElementById("admin-dashboards");
    if (panel) panel.style.display = "block";
    if (dashes) dashes.style.display = "block";
    subscribeProfilesForAdmin();
    alert("Modo administrador activado");
    return true;
  }
  alert("PIN incorrecto");
  return false;
}

// =====================================
// REGISTRO (FIX: obliga registro si falta algo)
// =====================================
async function ensureDeviceProfile() {
  // 1) si existe en localStorage y está completo -> OK
  if (
    DEVICE_PROFILE &&
    DEVICE_PROFILE.firstName &&
    DEVICE_PROFILE.lastName &&
    DEVICE_PROFILE.cedula
  ) {
    return;
  }

  // 2) revisar Firebase por si ya existe un perfil completo
  const snap = await deviceProfilesRef.child(DEVICE_ID).once("value");
  if (snap.exists()) {
    const p = snap.val() || {};
    if (p.firstName && p.lastName && p.cedula) {
      DEVICE_PROFILE = {
        firstName: p.firstName,
        lastName: p.lastName,
        cedula: p.cedula,
      };
      localStorage.setItem(DEVICE_PROFILE_KEY, JSON.stringify(DEVICE_PROFILE));
      return;
    }
  }

  // 3) si no existe o está incompleto -> limpiar y pedir registro
  DEVICE_PROFILE = null;
  localStorage.removeItem(DEVICE_PROFILE_KEY);
  showRegModal();
}

async function saveDeviceProfileFromModal() {
  const fn = norm(regFirstname.value);
  const ln = norm(regLastname.value);
  const ce = norm(regCedula.value);

  if (!fn || !ln || !ce) {
    regError.textContent = "Todos los campos son obligatorios";
    return;
  }

  // límite 48
  const all = (await deviceProfilesRef.once("value")).val() || {};
  if (!all[DEVICE_ID] && Object.keys(all).length >= MAX_VOTERS) {
    regError.textContent = "Registro cerrado (48 votantes)";
    return;
  }

  DEVICE_PROFILE = { firstName: fn, lastName: ln, cedula: ce };
  localStorage.setItem(DEVICE_PROFILE_KEY, JSON.stringify(DEVICE_PROFILE));

  await deviceProfilesRef.child(DEVICE_ID).set({
    ...DEVICE_PROFILE,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
  });

  hideRegModal();
  alert("Registro guardado. Ya puedes votar.");
}

// =====================================
// VOTOS (1 SOLO VOTO POR NOMINACIÓN)
// =====================================
function getVotes(c, n, p) {
  return votes?.[c]?.[n]?.[p] || 0;
}

function subscribeVotes() {
  votesRef.on("value", (snap) => {
    votes = snap.val() || {};

    // público
    if (currentCategoryId && currentNominationId) {
      renderNomination(currentCategoryId, currentNominationId);
    }

    // admin
    if (isAdmin) {
      renderVotesDashboard(); // live ranking
    }
  });
}

async function hasVotedNomination(c, n) {
  return (await deviceStatusRef.child(`${DEVICE_ID}/${c}/${n}`).once("value")).exists();
}

async function addVote(c, n, p) {
  // si por alguna razón no hay perfil, pedirlo
  if (!DEVICE_PROFILE || !DEVICE_PROFILE.firstName || !DEVICE_PROFILE.lastName || !DEVICE_PROFILE.cedula) {
    showRegModal();
    return;
  }

  // bloqueo: ya votó en esa nominación
  if (await hasVotedNomination(c, n)) {
    showBanner("✅ Ya votaste en esta nominación. Puedes votar en otras nominaciones.");
    return;
  }

  // marca que votó en esa nominación
  await deviceStatusRef.child(`${DEVICE_ID}/${c}/${n}`).set({
    participantId: p,
    votedAt: firebase.database.ServerValue.TIMESTAMP,
  });

  // suma voto global (acumula en tiempo real)
  await votesRef.child(`${c}/${n}/${p}`).transaction((v) => (v || 0) + 1);

  showBanner("✅ Voto registrado.");
  renderNomination(c, n);
}

// =====================================
// DASHBOARD USUARIOS (ADMIN)
// =====================================
let liveProfiles = {};

function subscribeProfilesForAdmin() {
  deviceProfilesRef.on("value", (snap) => {
    liveProfiles = snap.val() || {};
    renderUsersDashboard();
  });
}

function deleteUser(deviceId) {
  if (!ensureAdmin()) return;
  if (!confirm("¿Eliminar este usuario del registro?")) return;
  deviceProfilesRef.child(deviceId).remove();
}

function renderUsersDashboard() {
  const body = document.getElementById("users-dashboard-body");
  if (!body) return;
  body.innerHTML = "";

  Object.entries(liveProfiles).forEach(([deviceId, p]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.firstName || ""}</td>
      <td>${p.lastName || ""}</td>
      <td>${p.cedula || ""}</td>
      <td>${deviceId}</td>
      <td>${fmtDate(p.createdAt)}</td>
      <td><button class="danger" style="padding:4px 8px;font-size:.75rem">Eliminar</button></td>
    `;
    tr.querySelector("button").onclick = () => deleteUser(deviceId);
    body.appendChild(tr);
  });
}

// =====================================
// DASHBOARD VOTOS (ADMIN) - ranking nominación actual
// Incluye columna: Nombre de nominación
// =====================================
function renderVotesDashboard() {
  const tbody = document.getElementById("votes-dashboard-body");
  if (!tbody) return;

  const c = currentCategoryId,
    n = currentNominationId;
  if (!c || !n) {
    tbody.innerHTML = "";
    return;
  }

  const cat = categories.find((x) => x.id === c);
  const nom = cat?.nominations?.find((x) => x.id === n);
  if (!nom) {
    tbody.innerHTML = "";
    return;
  }

  const rows = nom.participants
    .map((pid) => ({
      pid,
      p: participantsById[pid],
      v: getVotes(c, n, pid),
    }))
    .filter((x) => x.p);

  // Ordena por votos (desc) en vivo
  rows.sort((a, b) => b.v - a.v);

  tbody.innerHTML = "";
  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${nom.name}</td>
      <td>
        <div class="mini">
          <img src="${r.p.photo}" alt="">
          <div>${r.p.name}</div>
        </div>
      </td>
      <td>${r.v}</td>
    `;
    tbody.appendChild(tr);
  });
}

// =====================================
// RESUMEN GENERAL (ADMIN) - líder por nominación (PRO)
// =====================================
function renderSummaryLeaders() {
  const panel = document.getElementById("summary-panel");
  const wrap = document.getElementById("dash-summary");
  if (!panel || !wrap) return;

  panel.innerHTML = "";

  categories.forEach((cat) => {
    cat.nominations.forEach((nom) => {
      let bestPid = null;
      let bestVotes = -1;

      nom.participants.forEach((pid) => {
        const v = getVotes(cat.id, nom.id, pid);
        if (v > bestVotes) {
          bestVotes = v;
          bestPid = pid;
        }
      });

      const winner = bestPid ? participantsById[bestPid] : null;
      const safeVotes = Math.max(bestVotes, 0);

      const card = document.createElement("div");
      card.className = "summary-card";
      card.innerHTML = `
        <div class="summary-title">${cat.name} – ${nom.name}</div>
        <div class="summary-row">
          ${winner ? `<img class="summary-photo" src="${winner.photo}" alt="">` : ``}
          <div class="summary-meta">
            <div class="summary-name">${winner ? winner.name : "Sin votos"}</div>
            <div class="summary-votes">Votos: ${winner ? safeVotes : 0}</div>
          </div>
        </div>
      `;
      panel.appendChild(card);
    });
  });

  wrap.style.display = "block";
}

// =====================================
// UI: Categorías / Nominaciones / Tarjetas
// =====================================
function renderCategoriesList() {
  categoryList.innerHTML = "";
  categories.forEach((cat) => {
    const b = document.createElement("button");
    b.className = "category-btn";
    b.dataset.id = cat.id;
    b.textContent = cat.name;
    b.onclick = () => selectCategory(cat.id);
    categoryList.appendChild(b);
  });
}

function highlightActiveCategory() {
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.id === currentCategoryId);
  });
}

function populateNominationSelect(cat) {
  nominationSelect.innerHTML = "";
  cat.nominations.forEach((n) => {
    const o = document.createElement("option");
    o.value = n.id;
    o.textContent = n.name;
    nominationSelect.appendChild(o);
  });

  nominationSelect.onchange = () => {
    currentNominationId = nominationSelect.value;
    renderNomination(currentCategoryId, currentNominationId);
    if (isAdmin) renderVotesDashboard();
  };
}

// Renderiza y ordena por votos (solo visualmente)
async function renderNomination(c, n) {
  const cat = categories.find((x) => x.id === c);
  if (!cat) return;
  const nom = cat.nominations.find((x) => x.id === n);
  if (!nom) return;

  categoryTitle.textContent = `${cat.name} – ${nom.name}`;

  const already = await hasVotedNomination(c, n);
  already
    ? showBanner("✅ Ya votaste en esta nominación. Puedes votar en otras nominaciones.")
    : hideBanner();

  // Ordena recuadros por votos (mayor a menor)
  const ordered = [...nom.participants]
    .map((pid) => ({
      pid,
      p: participantsById[pid],
      v: getVotes(c, n, pid),
    }))
    .filter((x) => x.p)
    .sort((a, b) => b.v - a.v);

  nomineesContainer.innerHTML = "";

  ordered.forEach(({ pid, p }) => {
    const card = document.createElement("div");
    card.className = "nominee-card";
    card.innerHTML = `
      <img src="${p.photo}" alt="${p.name}">
      <div class="nominee-name">${p.name}</div>
    `;

    const btn = document.createElement("button");
    btn.className = "vote-btn";
    btn.textContent = already ? "Ya votaste" : "+1 voto";
    btn.disabled = already;
    btn.onclick = () => addVote(c, n, pid);

    card.appendChild(btn);
    nomineesContainer.appendChild(card);
  });

  highlightActiveCategory();
}

function selectCategory(id) {
  currentCategoryId = id;
  const cat = categories.find((c) => c.id === id);
  if (!cat) return;

  populateNominationSelect(cat);
  currentNominationId = nominationSelect.value || cat.nominations?.[0]?.id;
  if (currentNominationId) renderNomination(id, currentNominationId);
}

// =====================================
// ADMIN: BOTONES
// =====================================
function showOnlyDash(whichId) {
  const dashSummary = document.getElementById("dash-summary");
  const dashVotes = document.getElementById("dash-votes");
  const dashUsers = document.getElementById("dash-users");

  if (dashSummary) dashSummary.style.display = "none";
  if (dashVotes) dashVotes.style.display = "none";
  if (dashUsers) dashUsers.style.display = "none";

  const el = document.getElementById(whichId);
  if (el) el.style.display = "block";
}

async function resetAllVotesAdmin() {
  if (!ensureAdmin()) return;
  if (!confirm("¿Seguro que deseas reiniciar TODOS los votos?")) return;
  await votesRef.set({});
  await deviceStatusRef.set({});
  alert("Votos reiniciados (global).");
}

// CSV simple de perfiles (admin)
function exportProfilesCSV() {
  if (!ensureAdmin()) return;
  const rows = [["deviceId", "firstName", "lastName", "cedula", "createdAt"]];
  Object.entries(liveProfiles || {}).forEach(([id, p]) => {
    rows.push([
      id,
      p.firstName || "",
      p.lastName || "",
      p.cedula || "",
      p.createdAt ? new Date(p.createdAt).toISOString() : "",
    ]);
  });

  const csv = rows
    .map((r) => r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "registro_votantes.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// =====================================
// INIT
// =====================================
window.addEventListener("DOMContentLoaded", async () => {
  // DOM cache
  categoryList = document.getElementById("category-list");
  nominationSelect = document.getElementById("nomination-select");
  categoryTitle = document.getElementById("category-title");
  nomineesContainer = document.getElementById("nominees-container");

  regBackdrop = document.getElementById("reg-modal-backdrop");
  regFirstname = document.getElementById("reg-firstname");
  regLastname = document.getElementById("reg-lastname");
  regCedula = document.getElementById("reg-cedula");
  regSave = document.getElementById("reg-save");
  regError = document.getElementById("reg-error");

  regSave.onclick = saveDeviceProfileFromModal;

  // Admin
  document.getElementById("admin-login").onclick = ensureAdmin;
  document.getElementById("btn-admin-reset-all").onclick = resetAllVotesAdmin;

  document.getElementById("btn-admin-summary").onclick = () => {
    if (!ensureAdmin()) return;
    renderSummaryLeaders();
    showOnlyDash("dash-summary");
  };

  document.getElementById("btn-admin-votes-dashboard").onclick = () => {
    if (!ensureAdmin()) return;
    renderVotesDashboard();
    showOnlyDash("dash-votes");
  };

  document.getElementById("btn-admin-users-dashboard").onclick = () => {
    if (!ensureAdmin()) return;
    renderUsersDashboard();
    showOnlyDash("dash-users");
  };

  document.getElementById("btn-admin-export-origins").onclick = exportProfilesCSV;

  // UI
  renderCategoriesList();
  if (categories?.length) selectCategory(categories[0].id);

  // Registro y votos
  await ensureDeviceProfile();
  subscribeVotes();
});