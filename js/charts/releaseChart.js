const d3 = window.d3;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function median(values) {
  return d3.quantileSorted([...values].sort(d3.ascending), 0.5);
}

export function renderReleaseChart(container, movies) {
  container.replaceChildren();

  if (!movies.length) {
    container.textContent = "No movies match the current filters.";
    return;
  }

  const decades = d3.range(
    d3.min(movies, (movie) => Math.floor(movie.releaseYear / 10) * 10),
    d3.max(movies, (movie) => Math.floor(movie.releaseYear / 10) * 10) + 1,
    10
  );
  const cells = decades.flatMap((decade) =>
    d3.range(1, 13).map((month) => {
      const matching = movies.filter(
        (movie) => Math.floor(movie.releaseYear / 10) * 10 === decade && movie.releaseMonth === month
      );
      const roiValues = matching.map((movie) => movie.roi);
      return {
        decade,
        month,
        movies: matching,
        count: matching.length,
        medianRoi: roiValues.length ? median(roiValues) : null,
        profitableRate: matching.length
          ? matching.filter((movie) => movie.roi >= 1).length / matching.length
          : null,
      };
    })
  );

  const width = Math.max(container.getBoundingClientRect().width, 700);
  const height = 430;
  const margin = { top: 28, right: 24, bottom: 56, left: 58 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const x = d3.scaleBand().domain(decades).range([0, innerWidth]).padding(0.08);
  const y = d3.scaleBand().domain(d3.range(1, 13)).range([0, innerHeight]).padding(0.08);
  const color = d3
    .scaleSequentialLog(d3.interpolateBlues)
    .domain([0.5, Math.max(5, d3.max(cells, (cell) => cell.medianRoi) || 5)]);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "Median movie return on investment by release month and decade");
  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  chart
    .selectAll("rect")
    .data(cells)
    .join("rect")
    .attr("x", (cell) => x(cell.decade))
    .attr("y", (cell) => y(cell.month))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("class", "release-cell")
    .attr("fill", (cell) => (cell.medianRoi === null ? "#f2f4f8" : color(cell.medianRoi)))
    .append("title")
    .text(
      (cell) =>
        `${MONTHS[cell.month - 1]} ${cell.decade}s: ${cell.count} films` +
        (cell.medianRoi === null
          ? "\nNo data"
          : `\nMedian ROI: ${cell.medianRoi.toFixed(1)}×\nProfitable: ${Math.round(cell.profitableRate * 100)}%`)
    );

  chart
    .append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3.axisBottom(x).tickFormat((decade) => `${String(decade).slice(0, 2)}0s`)
    );
  chart
    .append("g")
    .call(d3.axisLeft(y).tickFormat((month) => MONTHS[month - 1]));

  chart
    .selectAll(".cell-count")
    .data(cells.filter((cell) => cell.count > 0))
    .join("text")
    .attr("class", "cell-count")
    .attr("x", (cell) => x(cell.decade) + x.bandwidth() / 2)
    .attr("y", (cell) => y(cell.month) + y.bandwidth() / 2 + 3)
    .text((cell) => cell.count)
    .style("fill", (cell) => (cell.medianRoi > 3 ? "#fff" : "#172033"));

  svg
    .append("text")
    .attr("class", "chart-caption")
    .attr("x", margin.left)
    .attr("y", 16)
    .text("Cell color = median ROI · number = qualifying films");
}
