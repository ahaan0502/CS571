const d3 = window.d3;

let selectedDirector = null;

function median(values) {
  return d3.quantileSorted([...values].sort(d3.ascending), 0.5);
}

function summarizeDirectors(movies) {
  const grouped = d3.group(
    movies.flatMap((movie) => movie.directors.map((director) => ({ director, movie }))),
    (entry) => `${entry.director.id}-${entry.director.name}`
  );

  const summaries = [...grouped].map(([, entries]) => {
    const person = entries[0].director;
    const roiValues = entries.map((entry) => entry.movie.roi);
    return {
      id: person.id,
      name: person.name,
      movies: entries.map((entry) => entry.movie),
      count: entries.length,
      medianRoi: median(roiValues),
      profitableRate: entries.filter((entry) => entry.movie.roi >= 1).length / entries.length,
    };
  });

  const minimumCount = summaries.some((summary) => summary.count >= 3) ? 3 : 1;
  return summaries
    .filter((summary) => summary.count >= minimumCount)
    .sort((a, b) => d3.descending(a.medianRoi, b.medianRoi))
    .slice(0, 15);
}

function renderDirectorDetail(container, summary) {
  const detail = container.querySelector(".people-detail");
  if (!summary) {
    detail.innerHTML = "<p>Select a director to inspect their film and cast record.</p>";
    return;
  }

  const castCounts = d3.rollup(
    summary.movies.flatMap((movie) => movie.cast),
    (values) => values.length,
    (person) => `${person.id}-${person.name}`
  );
  const cast = [...castCounts]
    .map(([key, count]) => ({ name: key.slice(key.indexOf("-") + 1), count }))
    .sort((a, b) => d3.descending(a.count, b.count))
    .slice(0, 6);

  detail.innerHTML = `
    <div class="people-detail-heading">
      <div>
        <p class="eyebrow">Selected director</p>
        <h3>${summary.name}</h3>
      </div>
      <span>${summary.count} films · ${summary.medianRoi.toFixed(1)}× median ROI</span>
    </div>
    <p>Profitable films: ${Math.round(summary.profitableRate * 100)}%</p>
    <p class="people-detail-label">Frequent cast collaborators</p>
    <div class="cast-list">${cast.map((person) => `<span>${person.name} <b>${person.count}</b></span>`).join("")}</div>
    <p class="people-detail-label">Films</p>
    <ul class="film-list">${summary.movies.map((movie) => `<li>${movie.title} <span>${movie.roi.toFixed(1)}× ROI</span></li>`).join("")}</ul>
  `;
}

export function renderPeopleChart(container, movies) {
  container.replaceChildren();
  const summaries = summarizeDirectors(movies);

  if (!summaries.length) {
    container.textContent = "No director has enough qualifying films under the current filters.";
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "people-chart-wrapper";
  container.append(wrapper);

  const width = Math.max(container.getBoundingClientRect().width - 16, 560);
  const rowHeight = 28;
  const height = summaries.length * rowHeight + 36;
  const margin = { top: 12, right: 24, bottom: 36, left: 130 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxRoi = Math.max(4, d3.max(summaries, (summary) => summary.medianRoi));
  const x = d3.scaleLog().domain([0.5, maxRoi]).range([0, innerWidth]);
  const y = d3.scaleBand().domain(summaries.map((summary) => summary.name)).range([0, innerHeight]).padding(0.28);

  const svg = d3
    .select(wrapper)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "Ranked directors by median movie return on investment");
  const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  chart
    .append("line")
    .attr("class", "break-even-line")
    .attr("x1", x(1))
    .attr("x2", x(1))
    .attr("y1", 0)
    .attr("y2", innerHeight);

  chart
    .selectAll(".director-row")
    .data(summaries)
    .join("line")
    .attr("class", "director-row")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", (summary) => y(summary.name) + y.bandwidth() / 2)
    .attr("y2", (summary) => y(summary.name) + y.bandwidth() / 2);

  chart
    .selectAll(".director-dot")
    .data(summaries)
    .join("circle")
    .attr("class", "director-dot")
    .attr("cx", (summary) => x(summary.medianRoi))
    .attr("cy", (summary) => y(summary.name) + y.bandwidth() / 2)
    .attr("r", (summary) => 5 + Math.min(summary.count, 10))
    .attr("fill", (summary) => d3.interpolateRdYlGn(Math.min(summary.profitableRate, 1)))
    .style("cursor", "pointer")
    .on("click", (_, summary) => {
      selectedDirector = summary.name;
      renderPeopleChart(container, movies);
    })
    .append("title")
    .text((summary) => `${summary.name}: ${summary.medianRoi.toFixed(1)}× median ROI, ${summary.count} films`);

  chart.append("g").call(d3.axisLeft(y).tickSize(0));
  chart.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(5, "~g"));

  const selected = summaries.find((summary) => summary.name === selectedDirector) || summaries[0];
  wrapper.insertAdjacentHTML("beforeend", `<div class="people-detail"></div>`);
  renderDirectorDetail(wrapper, selected);
}
