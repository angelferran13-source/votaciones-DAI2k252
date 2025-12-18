// =====================================
// ESTADO GLOBAL
// =====================================

// votes[categoryId][nominationId][participantId] = número de votos (desde Firebase)
let votes = {};
let currentCategoryId = null;
let currentNominationId = null;

// ====== IDENTIFICADOR ÚNICO POR DISPOSITIVO (NAVEGADOR) ======
const DEVICE_ID_KEY = "device_id_v1";
let DEVICE_ID = localStorage.getItem(DEVICE_ID_KEY);
if (!DEVICE_ID) {
  DEVICE_ID =
    "dev_" +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36);
  localStorage.setItem(DEVICE_ID_KEY, DEVICE_ID);
}

// Mapa para acceder rápido a participantes
const participantsById = {};
if (Array.isArray(participants)) {
  participants.forEach((p) => {
    participantsById[p.id] = p;
  });
}

// Referencia para guardar los votos por dispositivo
// Estructura: deviceVotes/<DEVICE_ID>/<categoryId>/<nominationId>/<participantId> = true
const deviceVotesRef = firebase.database().ref("deviceVotes");

// =====================================
// BLOQUEO: 1 SOLO PARTICIPANTE POR NOMINACIÓN (por navegador)
// =====================================
//
// Estructura en localStorage:
// { "catId__nomId": "participantId" }

const LOCAL_LOCK_KEY = "user_vote_locks_v6";
let userVoteLocks = JSON.parse(localStorage.getItem(LOCAL_LOCK_KEY) || "{}");

function saveUserVoteLocks() {
  localStorage.setItem(LOCAL_LOCK_KEY, JSON.stringify(userVoteLocks));
}

function getNominationKey(categoryId, nominationId) {
  return `${categoryId}__${nominationId}`;
}

// participantId al que votó ESTE navegador en ESA nominación (o null)
function getUserVoteInNomination(categoryId, nominationId) {
  const key = getNominationKey(categoryId, nominationId);
  return userVoteLocks[key] || null;
}

function hasUserVotedNomination(categoryId, nominationId) {
  return !!getUserVoteInNomination(categoryId, nominationId);
}

function markUserVotedNomination(categoryId, nominationId, participantId) {
  const key = getNominationKey(categoryId, nominationId);
  userVoteLocks[key] = participantId;
  saveUserVoteLocks();
  updateAllVotedMessage();
}

// =====================================
// ADMIN (PIN + botón de login)
// =====================================

const ADMIN_PIN = "9275"; // 🔐 PIN admin
let isAdmin = false;

function ensureAdmin() {
  if (isAdmin) return true;

  const entered = prompt("Introduce el PIN de administrador:");
  if (entered === null) return false;

  if (entered === ADMIN_PIN) {
    isAdmin = true;
    alert("Modo administrador activado.");
    const btn = document.getElementById("admin-login");
    if (btn) {
      btn.textContent = "Admin activo";
      btn.disabled = true;
      btn.classList.add("admin-active");
    }
    return true;
  } else {
    alert("PIN incorrecto.");
    return false;
  }
}

// =====================================
// ACCESO A VOTOS (objeto 'votes')
// =====================================

function getVotes(categoryId, nominationId, participantId) {
  if (
    !votes[categoryId] ||
    !votes[categoryId][nominationId] ||
    typeof votes[categoryId][nominationId][participantId] !== "number"
  ) {
    return 0;
  }
  return votes[categoryId][nominationId][participantId];
}

// =====================================
// SUSCRIPCIÓN A FIREBASE
// =====================================

function subscribeToVotes() {
  if (typeof votesRef === "undefined") {
    console.error("votesRef no está definido. Revisa index.html.");
    return;
  }

  votesRef.on("value", (snapshot) => {
    votes = snapshot.val() || {};

    if (currentCategoryId && currentNominationId) {
      renderNomination(currentCategoryId, currentNominationId);
    }
    renderSummaryPanel();
  });
}

// =====================================
// RESET GLOBAL DE VOTOS (ADMIN CON PIN)
// =====================================

function resetAllVotes() {
  if (!ensureAdmin()) return;

  if (!confirm("¿Seguro que deseas reiniciar TODOS los votos (globalmente)?")) return;

  // Borra los votos globales y también el registro de votos por dispositivo
  const updates = {};
  updates["/votes"] = {};
  updates["/deviceVotes"] = {};

  firebase
    .database()
    .ref()
    .update(updates, (error) => {
      if (error) {
        console.error("Error al reiniciar votos:", error);
        alert("Error al reiniciar los votos.");
        return;
      }

      votes = {};
      userVoteLocks = {};
      saveUserVoteLocks();
      updateAllVotedMessage();

      if (currentCategoryId && currentNominationId) {
        renderNomination(currentCategoryId, currentNominationId);
      }
      renderSummaryPanel();
      alert("Todos los votos han sido reiniciados globalmente.");
    });
}

// =====================================
// INDICAR CUANDO YA VOTÓ EN TODAS LAS NOMINACIONES
// =====================================

function updateAllVotedMessage() {
  const msgEl = document.getElementById("all-voted-message");
  if (!msgEl) return;

  const allKeys = [];
  categories.forEach((cat) => {
    cat.nominations.forEach((nom) => {
      allKeys.push(getNominationKey(cat.id, nom.id));
    });
  });

  const allVoted =
    allKeys.length > 0 && allKeys.every((k) => !!userVoteLocks[k]);

  msgEl.style.display = allVoted ? "block" : "none";
}

// =====================================
// REGISTRO DE VOTO (1 PARTICIPANTE POR NOMINACIÓN)
// =====================================

function addVote(categoryId, nominationId, participantId) {
  // Solo puede elegir un participante por nominación
  if (hasUserVotedNomination(categoryId, nominationId)) {
    alert("Ya has votado en esta nominación. Solo puedes elegir un participante.");
    return;
  }

  if (typeof votesRef === "undefined") {
    console.error("votesRef no está definido.");
    return;
  }

  // 🔒 BLOQUEO OPTIMISTA: marcamos de una vez que votó
  markUserVotedNomination(categoryId, nominationId, participantId);

  // Guardamos que ESTE dispositivo votó por este participante
  const devPath = `${DEVICE_ID}/${categoryId}/${nominationId}/${participantId}`;
  deviceVotesRef.child(devPath).set(true, (err) => {
    if (err) {
      console.error("Error al guardar voto por dispositivo:", err);
    }
  });

  const ref = votesRef.child(`${categoryId}/${nominationId}/${participantId}`);

  ref.transaction(
    (current) => (current || 0) + 1,
    (error, committed) => {
      if (error || !committed) {
        console.error("Error al registrar voto:", error);

        // Revertimos bloqueo y registro de dispositivo
        const key = getNominationKey(categoryId, nominationId);
        delete userVoteLocks[key];
        saveUserVoteLocks();
        updateAllVotedMessage();

        deviceVotesRef
          .child(devPath)
          .remove()
          .catch(() => {});

        alert("Ocurrió un problema al registrar tu voto. Intenta de nuevo.");
      }
    }
  );
}

// =====================================
// RESET SOLO DE ESTA SESIÓN / DISPOSITIVO
// =====================================
//
// - Busca en deviceVotes/<DEVICE_ID> todos los votos que este dispositivo hizo.
// - Por cada uno, RESTA 1 al contador global.
// - Luego borra los registros de este dispositivo y desbloquea las nominaciones.
//

function resetSessionVotes() {
  if (
    !confirm(
      "Esto eliminará los votos que este dispositivo ha aportado y te permitirá votar de nuevo.\n\n" +
      "Los demás votos de otras personas NO se verán afectados.\n\n" +
      "¿Deseas continuar?"
    )
  ) {
    return;
  }

  const thisDeviceRef = deviceVotesRef.child(DEVICE_ID);

  thisDeviceRef.once("value", (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      // No hay registro de votos de este dispositivo
      userVoteLocks = {};
      saveUserVoteLocks();
      updateAllVotedMessage();
      if (currentCategoryId && currentNominationId) {
        renderNomination(currentCategoryId, currentNominationId);
      }
      alert("No había votos registrados para este dispositivo. Ya puedes votar de nuevo.");
      return;
    }

    const ops = [];

    // Recorremos: categoryId -> nominationId -> participantId
    Object.keys(data).forEach((categoryId) => {
      const nomObj = data[categoryId] || {};
      Object.keys(nomObj).forEach((nominationId) => {
        const partObj = nomObj[nominationId] || {};
        Object.keys(partObj).forEach((participantId) => {
          const voteRef = votesRef.child(`${categoryId}/${nominationId}/${participantId}`);

          const p = new Promise((resolve) => {
            voteRef.transaction(
              (current) => {
                const c = current || 0;
                // Evitamos negativos
                return c > 0 ? c - 1 : 0;
              },
              () => {
                resolve();
              }
            );
          });

          ops.push(p);
        });
      });
    });

    Promise.all(ops)
      .then(() => {
        // Borramos el registro de este dispositivo
        return thisDeviceRef.remove();
      })
      .then(() => {
        // Limpiamos los bloqueos locales
        userVoteLocks = {};
        saveUserVoteLocks();
        updateAllVotedMessage();

        if (currentCategoryId && currentNominationId) {
          renderNomination(currentCategoryId, currentNominationId);
        }

        alert("Se eliminaron los votos realizados desde este dispositivo. Ahora puedes votar de nuevo en todas las nominaciones.");
      })
      .catch((err) => {
        console.error("Error al resetear votos de este dispositivo:", err);
        alert("Hubo un problema al resetear tus votos. Intenta nuevamente.");
      });
  });
}

// =====================================
// RENDER DE CATEGORÍAS
// =====================================

function renderCategoriesList() {
  const listEl = document.getElementById("category-list");
  listEl.innerHTML = "";

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "category-btn";
    btn.dataset.id = cat.id;

    let thumb = null;
    if (
      cat.nominations &&
      cat.nominations[0] &&
      cat.nominations[0].participants &&
      cat.nominations[0].participants[0]
    ) {
      const pid = cat.nominations[0].participants[0];
      const p = participantsById[pid];
      if (p) thumb = p.photo;
    }

    if (thumb) {
      const img = document.createElement("img");
      img.src = thumb;
      img.alt = cat.name;
      btn.appendChild(img);
    }

    const span = document.createElement("span");
    span.textContent = cat.name;
    btn.appendChild(span);

    btn.onclick = () => selectCategory(cat.id);

    listEl.appendChild(btn);
  });
}

function highlightActiveCategory() {
  const buttons = document.querySelectorAll(".category-btn");
  buttons.forEach((btn) => {
    if (btn.dataset.id === currentCategoryId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// =====================================
// NOMINACIONES
// =====================================

function populateNominationSelect(cat) {
  const select = document.getElementById("nomination-select");
  select.innerHTML = "";

  cat.nominations.forEach((nom) => {
    const opt = document.createElement("option");
    opt.value = nom.id;
    opt.textContent = nom.name;
    select.appendChild(opt);
  });

  select.onchange = () => {
    currentNominationId = select.value;
    renderNomination(currentCategoryId, currentNominationId);
  };
}

function renderNomination(categoryId, nominationId) {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return;

  const nomination = category.nominations.find((n) => n.id === nominationId);
  if (!nomination) return;

  const titleEl = document.getElementById("category-title");
  titleEl.textContent = `${category.name} – ${nomination.name}`;

  const container = document.getElementById("nominees-container");
  container.innerHTML = "";

  const items = nomination.participants
    .map((pid) => {
      const p = participantsById[pid];
      if (!p) return null;
      const v = getVotes(categoryId, nominationId, pid);
      return { pid, participant: p, votes: v };
    })
    .filter((item) => item !== null);

  // Ordenar por votos (desc) y nombre
  items.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.participant.name.localeCompare(b.participant.name);
  });

  const votedPid = getUserVoteInNomination(categoryId, nominationId);
  const alreadyVotedNom = !!votedPid;

  items.forEach(({ pid, participant: p, votes: v }, index) => {
    const card = document.createElement("div");
    card.className = "nominee-card";
    if (index === 0 && v > 0) {
      card.classList.add("top");
    }

    const img = document.createElement("img");
    img.src = p.photo;
    img.alt = p.name;

    const nameEl = document.createElement("div");
    nameEl.className = "nominee-name";
    nameEl.textContent = p.name;

    const votesEl = document.createElement("div");
    votesEl.className = "nominee-votes";
    votesEl.innerHTML = `Votos: <span>${v}</span>`;

    const btn = document.createElement("button");
    btn.className = "vote-btn";

    if (!alreadyVotedNom) {
      btn.textContent = "+1 voto";
      btn.onclick = () => addVote(categoryId, nominationId, pid);
    } else if (votedPid === pid) {
      btn.textContent = "Ya votaste";
      btn.disabled = true;
    } else {
      btn.textContent = "Voto no disponible";
      btn.disabled = true;
    }

    card.appendChild(img);
    card.appendChild(nameEl);
    card.appendChild(votesEl);
    card.appendChild(btn);

    container.appendChild(card);
  });

  highlightActiveCategory();
  updateAllVotedMessage();
}

// =====================================
// RESUMEN GENERAL
// =====================================

function getLeaderForNomination(categoryId, nomination) {
  let leader = null;

  nomination.participants.forEach((pid) => {
    const p = participantsById[pid];
    if (!p) return;

    const v = getVotes(categoryId, nomination.id, pid);
    if (!leader || v > leader.votes) {
      leader = { participant: p, votes: v };
    }
  });

  return leader;
}

function renderSummaryPanel() {
  const panel = document.getElementById("summary-panel");
  if (!panel) return;

  panel.innerHTML = "";

  categories.forEach((cat) => {
    cat.nominations.forEach((nom) => {
      const leader = getLeaderForNomination(cat.id, nom);

      const card = document.createElement("div");
      card.className = "summary-card";

      const title = document.createElement("div");
      title.className = "summary-title";
      title.textContent = `${cat.name} – ${nom.name}`;

      const content = document.createElement("div");
      content.className = "summary-content";

      if (leader && leader.participant) {
        const img = document.createElement("img");
        img.src = leader.participant.photo;
        img.alt = leader.participant.name;

        const info = document.createElement("div");
        info.className = "summary-info";

        const nameEl = document.createElement("div");
        nameEl.className = "summary-name";
        nameEl.textContent = leader.participant.name;

        const votesEl = document.createElement("div");
        votesEl.className = "summary-votes";
        votesEl.innerHTML = `Votos: <strong>${leader.votes}</strong>`;

        info.appendChild(nameEl);
        info.appendChild(votesEl);
        content.appendChild(img);
        content.appendChild(info);
      } else {
        content.textContent = "Sin votos aún";
      }

      card.appendChild(title);
      card.appendChild(content);
      panel.appendChild(card);
    });
  });
}

// =====================================
// SELECCIÓN DE CATEGORÍA
// =====================================

function selectCategory(categoryId) {
  currentCategoryId = categoryId;
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return;

  populateNominationSelect(cat);
  const select = document.getElementById("nomination-select");
  currentNominationId =
    select.value || (cat.nominations[0] && cat.nominations[0].id);

  if (currentNominationId) {
    renderNomination(categoryId, currentNominationId);
  } else {
    document.getElementById("nominees-container").innerHTML = "";
  }
}

// =====================================
// INICIALIZACIÓN
// =====================================

window.addEventListener("DOMContentLoaded", () => {
  renderCategoriesList();

  const resetAllBtn = document.getElementById("reset-all");
  if (resetAllBtn) {
    resetAllBtn.addEventListener("click", resetAllVotes);
  }

  const resetSessionBtn = document.getElementById("reset-session");
  if (resetSessionBtn) {
    resetSessionBtn.addEventListener("click", resetSessionVotes);
  }

  const summaryAdminBtn = document.getElementById("show-summary-admin");
  if (summaryAdminBtn) {
    summaryAdminBtn.addEventListener("click", () => {
      if (!ensureAdmin()) return;
      const section = document.getElementById("summary-section");
      if (section) {
        section.style.display = "block";
      }
      renderSummaryPanel();
    });
  }

  const adminLoginBtn = document.getElementById("admin-login");
  if (adminLoginBtn) {
    adminLoginBtn.addEventListener("click", () => {
      ensureAdmin();
    });
  }

  if (categories.length > 0) {
    selectCategory(categories[0].id);
  }

  updateAllVotedMessage();
  subscribeToVotes();
});