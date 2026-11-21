// Общая логика FilmTrack для всех страниц.
const STORAGE_KEYS = {
  lists: "filmtrack_lists_v1",
  users: "filmtrack_demo_users_v1",
  currentUser: "filmtrack_current_user_v1"
};

const movies = window.FILMTRACK_MOVIES || [];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn("Не удалось прочитать localStorage:", error);
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCurrentUser() {
  return localStorage.getItem(STORAGE_KEYS.currentUser) || "";
}

function getLists() {
  return readStorage(STORAGE_KEYS.lists, {});
}

function saveMovieStatus(movieId, status) {
  const lists = getLists();

  if (status) {
    lists[movieId] = status;
  } else {
    delete lists[movieId];
  }

  writeStorage(STORAGE_KEYS.lists, lists);
  renderCatalog();
  renderMyList();
  updateListCounters();
}

function getMovieById(movieId) {
  return movies.find((movie) => movie.id === movieId);
}

function createMovieCard(movie) {
  const lists = getLists();
  const currentStatus = lists[movie.id] || "";

  return `
    <article class="movie-card">
      <button class="poster-button ${movie.posterClass}" type="button"
        data-open-details="${movie.id}" aria-label="Подробнее: ${movie.title}">
        <span class="poster-topline">${movie.type} / ${movie.year}</span>
        <span class="poster-title">${movie.posterLabel}</span>
        <span class="poster-bottomline">FILMTRACK SELECTION</span>
      </button>
      <div class="movie-card-info">
        <div>
          <h3>${movie.title}</h3>
          <p>${movie.year} · ${movie.type} · ${movie.genre}</p>
        </div>
        <select class="status-select" data-movie-status="${movie.id}" aria-label="Статус фильма ${movie.title}">
          <option value="" ${currentStatus === "" ? "selected" : ""}>＋ Добавить в список</option>
          <option value="Хочу посмотреть" ${currentStatus === "Хочу посмотреть" ? "selected" : ""}>Хочу посмотреть</option>
          <option value="Смотрю" ${currentStatus === "Смотрю" ? "selected" : ""}>Смотрю</option>
          <option value="Просмотрено" ${currentStatus === "Просмотрено" ? "selected" : ""}>Просмотрено</option>
        </select>
      </div>
    </article>
  `;
}

function renderMovieCards(container, movieList) {
  if (!container) return;

  if (!movieList.length) {
    container.innerHTML = '<div class="no-results">Ничего не найдено. Попробуй изменить поиск или фильтры.</div>';
    return;
  }

  container.innerHTML = movieList.map(createMovieCard).join("");
}

function renderCatalog() {
  const grid = document.querySelector("#catalog-grid");
  if (!grid) return;

  const search = (document.querySelector("#catalog-search")?.value || "").trim().toLowerCase();
  const type = document.querySelector("#type-filter")?.value || "all";
  const genre = document.querySelector("#genre-filter")?.value || "all";
  const sort = document.querySelector("#sort-filter")?.value || "default";

  let filtered = movies.filter((movie) => {
    const matchesSearch =
      movie.title.toLowerCase().includes(search) ||
      movie.originalTitle.toLowerCase().includes(search);
    const matchesType = type === "all" || movie.type === type;
    const matchesGenre = genre === "all" || movie.genre === genre;

    return matchesSearch && matchesType && matchesGenre;
  });

  if (sort === "title") {
    filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title, "ru"));
  } else if (sort === "year-desc") {
    filtered = [...filtered].sort((a, b) => b.year - a.year);
  } else if (sort === "year-asc") {
    filtered = [...filtered].sort((a, b) => a.year - b.year);
  }

  renderMovieCards(grid, filtered);

  const count = document.querySelector("#catalog-count");
  if (count) {
    count.textContent = `Найдено: ${filtered.length}`;
  }
}

function renderMyList() {
  const grid = document.querySelector("#my-list-grid");
  if (!grid) return;

  const activeTab = document.querySelector(".list-tab.active");
  const activeStatus = activeTab?.dataset.listStatus || "Хочу посмотреть";
  const lists = getLists();

  const selectedMovies = movies.filter((movie) => lists[movie.id] === activeStatus);
  renderMovieCards(grid, selectedMovies);

  const emptyMessage = document.querySelector("#empty-list");
  if (emptyMessage) {
    emptyMessage.hidden = selectedMovies.length > 0;
  }
}

function updateListCounters() {
  const lists = getLists();
  const countPlanned = Object.values(lists).filter((status) => status === "Хочу посмотреть").length;
  const countWatching = Object.values(lists).filter((status) => status === "Смотрю").length;
  const countWatched = Object.values(lists).filter((status) => status === "Просмотрено").length;

  const plannedElement = document.querySelector("#count-planned");
  const watchingElement = document.querySelector("#count-watching");
  const watchedElement = document.querySelector("#count-watched");

  if (plannedElement) plannedElement.textContent = countPlanned;
  if (watchingElement) watchingElement.textContent = countWatching;
  if (watchedElement) watchedElement.textContent = countWatched;
}

function setupCatalogFilters() {
  ["#catalog-search", "#type-filter", "#genre-filter", "#sort-filter"].forEach((selector) => {
    const element = document.querySelector(selector);
    element?.addEventListener("input", renderCatalog);
    element?.addEventListener("change", renderCatalog);
  });

  document.querySelector("#reset-filters")?.addEventListener("click", () => {
    document.querySelector("#catalog-search").value = "";
    document.querySelector("#type-filter").value = "all";
    document.querySelector("#genre-filter").value = "all";
    document.querySelector("#sort-filter").value = "default";
    renderCatalog();
  });
}

function setupListTabs() {
  document.querySelectorAll(".list-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".list-tab").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      renderMyList();
    });
  });
}

function setupMoodFinder() {
  const moodButtons = document.querySelectorAll(".mood-option");
  const prompt = document.querySelector("#mood-prompt");
  const resultSection = document.querySelector("#recommendation-section");
  const resultGrid = document.querySelector("#recommendation-grid");
  const caption = document.querySelector("#recommendation-caption");
  let selectedMood = "cozy";

  moodButtons.forEach((button) => {
    button.addEventListener("click", () => {
      moodButtons.forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      selectedMood = button.dataset.mood;
    });
  });

  document.querySelector("#make-recommendation")?.addEventListener("click", () => {
    const userText = (prompt?.value || "").toLowerCase();

    // Это простой демонстрационный подбор, а не подключённая нейросеть.
    let mood = selectedMood;

    if (userText.match(/страш|ужас|тайн|загад|мрач|атмосфер/)) {
      mood = "mysterious";
    } else if (userText.match(/смеш|весел|комед/)) {
      mood = "cozy";
    } else if (userText.match(/вдохнов|мечт|мотивац|цель/)) {
      mood = "inspiring";
    } else if (userText.match(/динамич|напряж|экшен|захватыв/)) {
      mood = "exciting";
    }

    let recommendations = movies.filter((movie) => movie.mood.includes(mood));

    if (userText.includes("сериал")) {
      recommendations = recommendations.filter((movie) => movie.type === "Сериал");
    } else if (userText.includes("фильм")) {
      recommendations = recommendations.filter((movie) => movie.type === "Фильм");
    }

    if (!recommendations.length) {
      recommendations = movies.filter((movie) => movie.mood.includes(selectedMood));
    }

    renderMovieCards(resultGrid, recommendations.slice(0, 4));
    caption.textContent = `${recommendations.length} варианта по твоему настроению`;
    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function setupMovieDetails() {
  const dialog = document.querySelector("#movie-details");
  const content = document.querySelector("#details-content");

  document.addEventListener("click", (event) => {
    const posterButton = event.target.closest("[data-open-details]");
    if (!posterButton || !dialog || !content) return;

    const movie = getMovieById(posterButton.dataset.openDetails);
    if (!movie) return;

    const status = getLists()[movie.id] || "";
    content.innerHTML = `
      <div class="details-poster ${movie.posterClass}">
        <span class="poster-title">${movie.posterLabel}</span>
      </div>
      <div class="details-copy">
        <p class="eyebrow">${movie.type.toUpperCase()} / ${movie.year} / ${movie.genre.toUpperCase()}</p>
        <h2>${movie.title}</h2>
        <p class="details-original">${movie.originalTitle}</p>
        <p>${movie.description}</p>
        <label class="details-status-label">Мой статус
          <select class="status-select" data-movie-status="${movie.id}">
            <option value="" ${!status ? "selected" : ""}>Не добавлено</option>
            <option value="Хочу посмотреть" ${status === "Хочу посмотреть" ? "selected" : ""}>Хочу посмотреть</option>
            <option value="Смотрю" ${status === "Смотрю" ? "selected" : ""}>Смотрю</option>
            <option value="Просмотрено" ${status === "Просмотрено" ? "selected" : ""}>Просмотрено</option>
          </select>
        </label>
      </div>
    `;
    dialog.showModal();
  });

  document.querySelector("[data-details-close]")?.addEventListener("click", () => dialog?.close());
}

function setupStatusChanges() {
  document.addEventListener("change", (event) => {
    const select = event.target.closest("[data-movie-status]");
    if (!select) return;

    saveMovieStatus(select.dataset.movieStatus, select.value);

    // После перерисовки каталога/списков статус снова отображается в актуальном виде.
    const detailsDialog = document.querySelector("#movie-details");
    if (detailsDialog?.open) {
      const movieId = select.dataset.movieStatus;
      const currentSelect = detailsDialog.querySelector(`[data-movie-status="${movieId}"]`);
      if (currentSelect) currentSelect.value = select.value;
    }
  });
}

function setupAuthentication() {
  const dialog = document.querySelector("[data-auth-dialog]");
  const form = document.querySelector("[data-auth-form]");
  const title = document.querySelector("[data-auth-title]");
  const error = document.querySelector("[data-auth-error]");
  let isRegistering = false;

  function updateHeaderAccount() {
    const user = getCurrentUser();
    document.querySelectorAll("[data-account-name]").forEach((element) => {
      element.textContent = user || "Гость";
    });
    document.querySelectorAll("[data-auth-open]").forEach((button) => {
      button.textContent = user ? "Выйти" : "Войти";
    });
  }

  document.querySelectorAll("[data-auth-open]").forEach((button) => {
    button.addEventListener("click", () => {
      if (getCurrentUser()) {
        localStorage.removeItem(STORAGE_KEYS.currentUser);
        updateHeaderAccount();
        return;
      }
      error.textContent = "";
      dialog?.showModal();
    });
  });

  document.querySelectorAll("[data-auth-close]").forEach((button) => {
    button.addEventListener("click", () => dialog?.close());
  });

  document.querySelectorAll("[data-auth-switch]").forEach((button) => {
    button.addEventListener("click", () => {
      isRegistering = !isRegistering;
      title.textContent = isRegistering ? "Регистрация" : "Войти";
      button.textContent = isRegistering
        ? "Уже есть аккаунт? Войти"
        : "Нет аккаунта? Зарегистрироваться";
      error.textContent = "";
    });
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const username = String(formData.get("username")).trim();
    const password = String(formData.get("password"));
    const users = readStorage(STORAGE_KEYS.users, {});

    if (isRegistering) {
      if (users[username]) {
        error.textContent = "Такое имя пользователя уже занято.";
        return;
      }
      users[username] = password;
      writeStorage(STORAGE_KEYS.users, users);
    } else if (users[username] !== password) {
      error.textContent = "Аккаунт не найден или пароль неверный. Проверь данные или зарегистрируйся.";
      return;
    }

    localStorage.setItem(STORAGE_KEYS.currentUser, username);
    form.reset();
    dialog.close();
    updateHeaderAccount();
  });

  updateHeaderAccount();
}

function setupMobileMenu() {
  const button = document.querySelector(".mobile-menu-button");
  const navigation = document.querySelector(".main-nav");

  button?.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupMobileMenu();
  setupAuthentication();
  setupStatusChanges();
  setupMovieDetails();
  setupCatalogFilters();
  setupListTabs();
  setupMoodFinder();
  renderCatalog();
  renderMyList();
  updateListCounters();
});
