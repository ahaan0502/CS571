const filterIds = ["genre-filter", "budget-filter", "season-filter", "votes-filter"];

const state = {
  movies: [],
  filters: {
    genre: "all",
    budgetTier: "all",
    season: "all",
    minimumVotes: 0,
  },
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
 notation: "compact",
});

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function addOptions(selector, values) {
  const element = document.querySelector(selector);
  values.forEach((value) => {
    element.insertAdjacentHTML("beforeend", `<option value="${value}">${value}</option>`);
  });
}

function populateFilters() {
  addOptions("#genre-filter", uniqueSorted(state.movies.flatMap((movie) => movie.genres)));
  addOptions("#budget-filter", uniqueSorted(state.movies.map((movie) => movie.budgetTier)));
  addOptions("#season-filter", ["Winter", "Spring", "Summer", "Fall"]);
}

function filteredMovies() {
  const { genre, budgetTier, season, minimumVotes } = state.filters;
  return state.movies.filter((movie) =>
    (genre === "all" || movie.genres.includes(genre)) &&
    (budgetTier === "all" || movie.budgetTier === budgetTier) &&
    (season === "all" || movie.season === season) &&
    movie.voteCount >= minimumVotes
  );
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function renderSummary() {
  const movies = filteredMovies();
  const medianRoi = median(movies.map((movie) => movie.roi));
  const medianBudget = median(movies.map((movie) => movie.budget));
  const profitable = movies.filter((movie) => movie.roi >= 1).length;

  document.querySelector("#kpi-films").textContent = movies.length.toLocaleString();
  document.querySelector("#kpi-roi").textContent = medianRoi === null ? "—" : `${medianRoi.toFixed(1)}×`;
  document.querySelector("#kpi-profitable").textContent = movies.length
    ? `${Math.round((profitable / movies.length) * 100)}%`
    : "—";
  document.querySelector("#kpi-budget").textContent = medianBudget === null ? "—" : money.format(medianBudget);
  document.querySelector("#data-status").textContent =
    `${movies.length.toLocaleString()} of ${state.movies.length.toLocaleString()} ROI-qualified movies are currently shown.`;
}

function bindControls() {
  const controls = Object.fromEntries(
    filterIds.map((id) => [id, document.querySelector(`#${id}`)])
  );

  controls["genre-filter"].addEventListener("change", (event) => {
    state.filters.genre = event.target.value;
    renderSummary();
  });
  controls["budget-filter"].addEventListener("change", (event) => {
    state.filters.budgetTier = event.target.value;
    renderSummary();
  });
  controls["season-filter"].addEventListener("change", (event) => {
    state.filters.season = event.target.value;
    renderSummary();
  });
  controls["votes-filter"].addEventListener("change", (event) => {
    state.filters.minimumVotes = Number(event.target.value);
    renderSummary();
  });

  document.querySelector("#reset-filters").addEventListener("click", () => {
    filterIds.forEach((id) => {
      controls[id].selectedIndex = 0;
    });
    state.filters = {
      genre: "all",
      budgetTier: "all",
      season: "all",
      minimumVotes: 0,
    };
    renderSummary();
  });
}

async function initialize() {
  bindControls();
  try {
    const response = await fetch("./data/movies.json");
    if (!response.ok) throw new Error(`Dataset request failed: ${response.status}`);
    const payload = await response.json();
    state.movies = payload.movies;
    populateFilters();
    renderSummary();
  } catch (error) {
    document.querySelector("#data-status").textContent =
      "The prepared dataset could not be loaded. Run the site through a local web server or GitHub Pages.";
    console.error(error);
  }
}

initialize();
