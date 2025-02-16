let data = []; // This will store our CSV data
let commits = [];
let xScale, yScale; // Global scales for mapping data to coordinates
let brushSelection = null; // Global variable for the current brush selection

async function loadData() {
  data = await d3.csv('loc.csv', (row) => ({
    ...row, // Keep all existing properties
    line: Number(row.line), // Convert "line" to a number
    depth: Number(row.depth), // Convert "depth" to a number
    length: Number(row.length), // Convert "length" to a number
    date: new Date(row.date + 'T00:00' + row.timezone), // Convert "date" to Date object
    datetime: new Date(row.datetime) // Convert "datetime" to Date object
  }));
  processCommits();
  displayStats();
  createScatterPlot(commits);
}

// Load data when the page is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
});

function processCommits() {
  commits = d3.groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author: first.author,
        date: first.date,
        time: first.time,
        timezone: first.timezone,
        datetime: first.datetime,
        hourFrac: first.datetime.getHours() + first.datetime.getMinutes() / 60,
        totalLines: lines.length
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false, // Hide from console logs
        configurable: true
      });

      return ret;
    });
}

function displayStats() {
  // Process commits first
  processCommits();

  // Create the dl element for stats
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // Add total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // Add total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  // Add more stats as needed...
  let maxFileLength = d3.max(data, (d) => d.length);
  dl.append('dt').text('Max File Length');
  dl.append('dd').text(maxFileLength);

  let numAuthors = new Set(data.map((d) => d.author)).size;
  dl.append('dt').text('Number of unique authors');
  dl.append('dd').text(numAuthors);

  let workByPeriod = d3.rollups(
    data,
    (v) => v.length,
    (d) => new Date(d.datetime).toLocaleString('en', { hour: 'numeric' })
  );
  let maxPeriod = d3.greatest(workByPeriod, (d) => d[1])[0];
  dl.append('dt').text('Time of day most commits occur');
  dl.append('dd').text(maxPeriod);
}

function createScatterPlot(commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([10, 30]); // Dot size in pixels

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  // Create the outer SVG container
  const svgContainer = d3
    .select('#chart')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // Append an inner group for chart elements
  const svg = svgContainer.append('g').style('overflow', 'visible');

  // Set global scales
  xScale = d3.scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([24, 0])
    .range([usableArea.bottom, usableArea.top]);

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  // Add gridlines BEFORE the axes
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);
  gridlines.call(
    d3.axisLeft(yScale)
      .tickFormat('') // Remove labels
      .tickSize(-usableArea.width) // Extend ticks across the width
  );

  svg.append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  // Append a group for the dots
  const dots = svg.append('g').attr('class', 'dots');

  dots.selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('fill-opacity', 0.7)
    .attr('fill', 'steelblue')
    .on('mouseenter', function (event, d) {
      d3.select(this).style('fill-opacity', 1); // Highlight dot
      updateTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', function (event, d) {
      d3.select(this).style('fill-opacity', 0.7); // Restore transparency
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });

  // Add the brush in its own group, listen for brush events, and lower it behind the dots.
  const brushGroup = svgContainer.append('g').attr('class', 'brush');
  brushGroup.call(d3.brush().on('start brush end', brushed));
  brushGroup.lower();
}

function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');

  // If no commit data is available, exit the function
  if (Object.keys(commit).length === 0) return;

  // Update tooltip content
  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

// BRUSH & SELECTION FUNCTIONS

// Called whenever the brush is moved
function brushed(event) {
  brushSelection = event.selection;
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

// Checks whether a commit is within the current brush selection
function isCommitSelected(commit) {
  if (!brushSelection) return false;
  const min = { x: brushSelection[0][0], y: brushSelection[0][1] };
  const max = { x: brushSelection[1][0], y: brushSelection[1][1] };
  // Map commit data to x and y coordinates using global scales
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
}

// Updates the visual state of dots based on selection
function updateSelection() {
  d3.selectAll('circle')
    .classed('selected', (d) => isCommitSelected(d));
}

// Updates the text that shows the count of selected commits
function updateSelectionCount() {
  const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
  return selectedCommits;
}

// Updates the language breakdown stats for the selected commits
function updateLanguageBreakdown() {
  const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  // Get lines from all selected commits
  const lines = selectedCommits.flatMap((d) => d.lines);

  // Count lines per language using d3.rollup
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  // Update DOM with the language breakdown
  container.innerHTML = '';
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }

  return breakdown;
}
