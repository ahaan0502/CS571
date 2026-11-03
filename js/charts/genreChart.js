const d3 = window.d3;

function quartile(values, fraction) {
  return d3.quantileSorted([...values].sort(d3.ascending), fraction);
}

function summarizeGenres(movies) {
  const grouped = d3.group(
    movies.flatMap((movie) => movie.genres.map((genre) => ({ genre, movie }))),
    (entry) => entry.genre
  );

  return [...grouped]
    .map(([genre, entries]) => {
      const values = entries.map((entry) => entry.movie.roi).filter((value) => value > 0);
      return {
        genre,
        entries,
        values,
        count: values.length,
        min: d3.min(values),
        q1: quartile(values, 0.25),
        median: quartile(values, 0.5),
        q3: quartile(values, 0.75),
        max: d3.max(values),
      };
    })
    .filter((summary) => summary.count > 0)
    .sort((a, b) => d3.descending(a.median, b.median));
}

export function renderGenreChart(container, movies) {
  container.replaceChildren();

  if (!movies.length) {
    container.textContent = "No movies match the current filters.";
    return;
  }

  const summaries = summarizeGenres(movies);
  const width = Math.max(container.getBoundingClientRect().width, 620);
  const height = 410;
  const margin = { top: 20, right: 20, bottom: 92, left: 58 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxRoi = Math.max(4, d3.max(summaries, (summary) => summary.max));

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "Return on investment distributions by movie genre");

  const x = d3
    .scaleBand()
    .domain(summaries.map((summary) => summary.genre))
    .range([0, innerWidth])
    .padding(0.25);
  const y = d3.scaleLog().domain([0.25, maxRoi]).range([innerHeight, 0]).nice();

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  chart
    .append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(() => ""));

  chart
    .append("line")
    .attr("class", "break-even-line")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", y(1))
    .attr("y2", y(1));

  chart
    .append("text")
    .attr("class", "break-even-label")
    .attr("x", innerWidth)
    .attr("y", y(1) - 6)
    .attr("text-anchor", "end")
    .text("Break-even");

  const groups = chart
    .selectAll(".genre-group")
    .data(summaries)
    .join("g")
    .attr("class", "genre-group")
    .attr("transform", (summary) => `translate(${x(summary.genre)},0)`)
    .style("cursor", "pointer")
    .on("click", (_, summary) => {
      const filter = document.querySelector("#genre-filter");
      filter.value = summary.genre;
      filter.dispatchEvent(new Event("change"));
    });

  groups
    .append("line")
    .attr("class", "box-whisker")
    .attr("x1", x.bandwidth() / 2)
    .attr("x2", x.bandwidth() / 2)
    .attr("y1", (summary) => y(summary.min))
    .attr("y2", (summary) => y(summary.max));

  groups
    .append("line")
    .attr("class", "box-cap")
    .attr("x1", x.bandwidth() * 0.28)
    .attr("x2", x.bandwidth() * 0.72)
    .attr("y1", (summary) => y(summary.min))
    .attr("y2", (summary) => y(summary.min));

  groups
    .append("line")
    .attr("class", "box-cap")
    .attr("x1", x.bandwidth() * 0.28)
    .attr("x2", x.bandwidth() * 0.72)
    .attr("y1", (summary) => y(summary.max))
    .attr("y2", (summary) => y(summary.max));

  groups
    .append("rect")
    .attr("class", "box-rect")
    .attr("x", 0)
    .attr("width", x.bandwidth())
    .attr("y", (summary) => y(summary.q3))
    .attr("height", (summary) => Math.max(2, y(summary.q1) - y(summary.q3)))
    .append("title")
    .text((summary) => `${summary.genre}: median ${summary.median.toFixed(1)}× ROI, ${summary.count} films`);

  groups
    .append("line")
    .attr("class", "median-line")
    .attr("x1", 0)
    .attr("x2", x.bandwidth())
    .attr("y1", (summary) => y(summary.median))
    .attr("y2", (summary) => y(summary.median));

  groups
    .selectAll("circle")
    .data((summary) => summary.entries)
    .join("circle")
    .attr("class", "movie-point")
    .attr("cx", () => x.bandwidth() * (0.2 + Math.random() * 0.6))
    .attr("cy", (entry) => y(entry.movie.roi))
    .attr("r", 2.4)
    .append("title")
    .text((entry) => `${entry.movie.title}: ${entry.movie.roi.toFixed(1)}× ROI`);

  chart
    .append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-38)")
    .style("text-anchor", "end");

  chart.append("g").call(d3.axisLeft(y).ticks(6, "~g"));

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin.top + innerHeight / 2))
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .text("ROI (log scale)");
}
