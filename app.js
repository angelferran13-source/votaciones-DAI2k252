// =====================================
// ESTADO GLOBAL
// =====================================

// votes[categoryId][nominationId][participantId] = número de votos
let votes = {};
let currentCategoryId = null;
let currentNominationId = null;

// =====================================
// BLOQUEO: 1 VOTO POR DISPOSITIVO
// =====================================

const LOCAL_LOCK_KEY = "user_vote_locks_v1"; // se guarda en localStorage

let userVoteLocks = JSON.parse(localStorage.getItem(LOCAL_LOCK_KEY) || "{}");

function saveUserVoteLocks() {
  localStorage.setItem(LOCAL_LOCK_KEY, JSON.stringify(userVoteLocks));
}

function getVoteKey(categoryId, nominationId, participantId) {
  return `${categoryId}__${nominationId}__${participantId}`;
}

function hasUserVoted(categoryId, nominationId, participantId) {
  const key = getVoteKey(categoryId, nominationId, participantId);
  return !!userVoteLocks[key];
}

function markUserVoted(categoryId, nominationId, participantId) {
  const key = getVoteKey(categoryId, nominationId, participantId);
  userVoteLocks[key] = true;
  saveUserVoteLocks();
}

// =====================================
// AYUDA PARA LEER VOTOS
// =====================================

function getVotes(categoryId, nominationId, participantId) {
  if (
    !votes[categoryId] ||
    !votes[categoryId][nominationId] ||
    votes[categoryId][nominationId][participantId] == null
  ) {
    return 0;
  }
  return votes[categoryId][nominationId][participantId];
}

// =====================================
// SUSCRIPCIÓN A FIREBASE (TIEMPO REAL)
// =====================================

// votesRef viene desde index.html (window.votesRef)
function subscribeToVotes() {
  if (typeof votesRef === "undefined") {
    console.error("votesRef no está definido. Revisa index.html");
    return;
  }

  votesRef.on("value", (snapshot) => {
    votes = snapshot.val() || {};

    // Si hay categoría/nominación seleccionada, redibujar
    if (currentCategoryId && currentNominationId) {
      renderNomination(currentCategoryId, currentNominationId);
    } else {
      renderSummaryPanel();
    }
  });
}

// =====================================
// RENDER CATEGORÍAS
// =====================================

function renderCategoriesList() {
  const listEl = document.getElementById("category-list");
  listEl.innerHTML = "";

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "category-btn";
    btn.dataset.id = cat.id;

    // mini foto
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
    const option = document.createElement("option");
    option.value = nom.id;
    option.textContent = nom.name;
    select.appendChild(option);
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

  nomination.participants.forEach((pid) => {
    const p = participantsById[pid];
    if (!p) return;

    const card = document.createElement("div");
    card.className = "nominee-card";

    const img = document.createElement("img");
    img.src = p.photo;
    img.alt = p.name;

    const nameEl = document.createElement("div");
    nameEl.className = "nominee-name";
    nameEl.textContent = p.name;

    const v = getVotes(categoryId, nominationId, pid);
    const votesEl = document.createElement("div");
    votesEl.className = "nominee-votes";
    votesEl.innerHTML = `Votos: <span>${v}</span>`;

    const alreadyVoted = hasUserVoted(categoryId, nominationId, pid);

    const btn = document.createElement("button");
    btn.className = "vote-btn";

    if (alreadyVoted) {
      btn.textContent = "Ya votaste";
      btn.disabled = true;
    } else {
      btn.textContent = "+1 voto";
      btn.onclick = () => addVote(categoryId, nominationId, pid);
    }

    card.appendChild(img);
    card.appendChild(nameEl);
    card.appendChild(votesEl);
    card.appendChild(btn);

    container.appendChild(card);
  });

  highlightActiveCategory();
  renderSummaryPanel();
}

// =====================================
// LÓGICA DE VOTO EN FIREBASE
// =====================================

function addVote(categoryId, nominationId, participantId) {
  if (hasUserVoted(categoryId, nominationId, participantId)) {
    alert("Ya has votado por este participante en esta nominación.");
    return;
  }

  const ref = votesRef.child(`${categoryId}/${nominationId}/${participantId}`);

  ref.transaction(
    (current) => {
      return (current || 0) + 1;
    },
    (error, committed) => {
      if (!error && committed) {
        markUserVoted(categoryId, nominationId, participantId);
        // No llamamos a renderNomination aquí, subscribeToVotes se encargará
      } else if (error) {
        console.error("Error al registrar voto:", error);
      }
    }
  );
}

function resetAllVotes() {
  if (!confirm("¿Seguro que deseas reiniciar TODOS los votos?")) return;

  votesRef.set({}, (error) => {
    if (error) {
      console.error("Error al reiniciar votos:", error);
      return;
    }
    votes = {};
    userVoteLocks = {};
    saveUserVoteLocks();

    if (currentCategoryId && currentNominationId) {
      renderNomination(currentCategoryId, currentNominationId);
    } else {
      renderSummaryPanel();
    }
  });
}

// =====================================
// RESUMEN GENERAL (LÍDER POR NOMINACIÓN)
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
  }
}

// =====================================
// INICIO
// =====================================

window.addEventListener("DOMContentLoaded", () => {
  renderCategoriesList();

  const resetBtn = document.getElementById("reset-all");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetAllVotes);
  }

  if (categories.length > 0) {
    selectCategory(categories[0].id);
  }

  subscribeToVotes(); // 🔥 escuchar cambios en tiempo real
});