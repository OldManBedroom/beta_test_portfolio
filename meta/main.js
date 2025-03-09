// ---------------------------------------------------
// main.js (Final Version with Scrollytelling, No Slider)
// ---------------------------------------------------

// Global variables
let data = [];
let commits = [];
let selectedCommits = []; // For brush-based selection

// Scales for scatter plot
let xScale, yScale;

// Scrollytelling constants
const ITEM_HEIGHT = 80;     // Height (in px) for each commit item in the scrolly
const VISIBLE_COUNT = 3;    // How many commits to render at once in the scroll list

let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

fileTypeColors.domain([
  'js', 'html', 'svelte', 'css', 'md', // etc...
]);

// When the page loads, set everything up
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  processCommits();

  // Display overall stats once (they remain static)
  displayStats();

  // Set up scrollytelling (chart and commit list will update as you scroll)
  setupScrollytelling();

  setupFilesScrollytelling();
});

// 1) Load CSV data
async function loadData() {
  data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
}

// 2) Process the data into a commits array
function processCommits() {
  commits = d3.groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author: first.author,
        date: first.date,
        time: first.time,
        timezone: first.timezone,
        datetime: first.datetime,
        hourFrac: first.datetime.getHours() + first.datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      // Keep lines array non-enumerable
      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,
        configurable: true,
      });

      return ret;
    });

  // (Optional) Sort commits by datetime if you want them in chronological order
  commits.sort((a, b) => d3.ascending(a.datetime, b.datetime));
}

// 3) Display overall stats for ALL commits (called once at page load)
function displayStats() {
  // Clear any old stats
  d3.select('#stats').selectAll('*').remove();

  const dl = d3.select('#stats')
    .append('dl')
    .attr('class', 'stats');

  // 3a) Total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // 3b) Total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  // 3c) Max File Length
  const maxFileLength = d3.max(data, (d) => d.length);
  dl.append('dt').text('Max File Length');
  dl.append('dd').text(maxFileLength || 0);

  // 3d) Number of unique authors
  const numAuthors = new Set(data.map((d) => d.author)).size;
  dl.append('dt').text('Number of unique authors');
  dl.append('dd').text(numAuthors);

  // 3e) Time of day most commits occur
  const workByPeriod = d3.rollups(
    data,
    (v) => v.length,
    (d) => new Date(d.datetime).toLocaleString('en', { hour: 'numeric' })
  );
  if (workByPeriod.length > 0) {
    const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])[0];
    dl.append('dt').text('Time of day most commits occur');
    dl.append('dd').text(maxPeriod);
  }
}

// 4) Set up scrollytelling
function setupScrollytelling() {
  // Set #spacer height to allow scrolling over all commits
  d3.select('#spacer')
    .style('height', `${commits.length * ITEM_HEIGHT}px`);

  // Listen for scroll on #scroll-container
  const scrollContainer = d3.select('#scroll-container');
  scrollContainer.on('scroll', () => {
    const scrollTop = scrollContainer.property('scrollTop');
    
    // Compute which commit index to start from
    const startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    // Clamp to a maximum value (for example, here using 7 as an upper bound)
    const clampedIndex = Math.min(startIndex, 7);
    renderItems(clampedIndex);
    console.log("startIndex:", clampedIndex);
  });

  // Render the initial slice
  renderItems(0);
}

// 5) Render a slice of commits (the “visible” ones) in the scrollytelling
function renderItems(startIndex) {
  // Optional: log container scroll details for debugging
  const scrollContainer = document.getElementById('scroll-container');
  const scrollTop = scrollContainer.scrollTop;
  const scrollBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
  
  // Slice the commits array for display
  const newCommitSlice = commits.slice(startIndex, startIndex + 5);

  // 5a) Render scrolly items
  d3.select('#items-container')
    .selectAll('.item')
    .remove(); // Clear old items

  const items = d3.select('#items-container')
    .selectAll('.item')
    .data(newCommitSlice, (d) => d.id)
    .join('div')
      .attr('class', 'item')
      .style('position', 'absolute')
      .style('top', (d, i) => `${(i + startIndex) * ITEM_HEIGHT}px`)
      // Display commit info: ID, date, author, and changed lines
      .html((d, i) => {
        const dateStr = d.datetime.toLocaleString('en', { 
          dateStyle: 'short', 
          timeStyle: 'short' 
        });
        return `
          <p>
            <strong>${d.id.slice(0, 7)}</strong>
            &middot;
            <em>${dateStr}</em>
            &middot;
            ${d.author}
          </p>
          <p>${d.lines.length} lines changed</p>
        `;
      });

  // 5b) Update the scatterplot with these commits
  updateScatterplot(newCommitSlice);

  // 5c) Update the file listing with these commits
  //updateFilesList(newCommitSlice);

  // 5d) (Do NOT update summary stats here so they remain static)
  // updateStats(newCommitSlice);
}

function setupFilesScrollytelling() {
  // Set the height of the new spacer so that the scroll area matches the total commits height
  d3.select('#files-spacer')
    .style('height', `${commits.length * ITEM_HEIGHT}px`);

  // Listen for scroll on the new container
  const scrollContainer = d3.select('#files-scroll-container');
  scrollContainer.on('scroll', () => {
    const scrollTop = scrollContainer.property('scrollTop');
    // Compute which commit index to start from (using same ITEM_HEIGHT)
    const startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    // Clamp as needed (using VISIBLE_COUNT or similar)
    const clampedIndex = Math.min(startIndex, commits.length - VISIBLE_COUNT);
    renderFilesItems(clampedIndex);
  });

  // Render the initial slice
  renderFilesItems(0);
}

// Render a slice of commits for the file size changes scrolly
function renderFilesItems(startIndex) {
  // Slice the commits array for display
  const newCommitSlice = commits.slice(startIndex, startIndex + VISIBLE_COUNT);

  // 1) Render the scrolly items (the “visible” ones)
  d3.select('#files-items-container')
    .selectAll('.item')
    .remove(); // Clear old items

  d3.select('#files-items-container')
    .selectAll('.item')
    .data(newCommitSlice, (d) => d.id)
    .join('div')
      .attr('class', 'item')
      .style('position', 'absolute')
      .style('top', (d, i) => `${(i + startIndex) * ITEM_HEIGHT}px`)
      .html((d) => {
        const dateStr = d.datetime.toLocaleString('en', { 
          dateStyle: 'short', 
          timeStyle: 'short' 
        });
        return `
          <p>
            <strong>${d.id.slice(0, 7)}</strong>
            &middot;
            <em>${dateStr}</em>
            &middot;
            ${d.author}
          </p>
          <p>${d.lines.length} lines changed</p>
        `;
      });

  // 2) Update the file size changes visualization only.
  // (Do not call updateScatterplot here)
  updateFilesList(newCommitSlice);
  updateStats(commits.slice(0, startIndex + 5));
}

// 6) Update the scatterplot with a given subset of commits
function updateScatterplot(filteredCommits) {
  // Clear old SVG
  d3.select('#chart').selectAll('svg').remove();

  // Basic chart setup
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // xScale based on the subset
  xScale = d3.scaleTime()
    .domain(d3.extent(filteredCommits, (d) => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  // yScale for hour-of-day
  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  // rScale for circle size
  const rScale = d3.scaleSqrt()
    .domain(d3.extent(filteredCommits, (d) => d.totalLines))
    .range([5, 30]);

  // Axes
  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(
      d3.axisLeft(yScale)
        .tickFormat((d) => `${String(d % 24).padStart(2, '0')}:00`)
    );

  // Plot circles
  const dots = svg.append('g').attr('class', 'dots');
  dots.selectAll('circle')
    .data(filteredCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', function (event, d) {
      d3.select(event.currentTarget)
        .style('fill-opacity', 1)
        .classed('selected', selectedCommits.includes(d));
      updateTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', function (event, d) {
      d3.select(event.currentTarget)
        .style('fill-opacity', 0.7)
        .classed('selected', selectedCommits.includes(d));
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });

  // Attach brush
  brushSelector(svg);

  // Re-apply selection styling, selection count, and language breakdown
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

// 7) Brush setup
function brushSelector(svg) {
  const brush = d3.brush()
    .extent([[0, 0], [1000, 600]]) // match the SVG area
    .on('start brush end', brushed);

  svg.call(brush);

  // Raise dots above the brush overlay
  svg.selectAll('.dots, .overlay ~ *').raise();
}

// 8) Brush event: determine which commits are in the selection
function brushed(event) {
  const selection = event.selection;
  if (!selection) {
    // If brush is cleared
    selectedCommits = [];
  } else {
    const [[x0, y0], [x1, y1]] = selection;
    selectedCommits = commits.filter((d) => {
      const x = xScale(d.datetime);
      const y = yScale(d.hourFrac);
      return x0 <= x && x <= x1 && y0 <= y && y <= y1;
    });
  }

  // Update visuals
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

// 9) Mark circles as selected/unselected
function updateSelection() {
  d3.selectAll('circle')
    .classed('selected', (d) => selectedCommits.includes(d));
}

// 10) Show how many commits are selected
function updateSelectionCount() {
  const countElement = document.getElementById('selection-count');
  if (!countElement) return;
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
}

// 11) Language breakdown based on selectedCommits
function updateLanguageBreakdown() {
  const container = document.getElementById('language-breakdown');
  if (!container) return;

  // If no commits are selected, clear
  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Flatten out lines from selected commits
  const lines = selectedCommits.flatMap((d) => d.lines);

  // Tally lines by d.type
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  container.innerHTML = '';
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

// 12) File listing as a unit visualization
function updateFilesList(filteredCommits) {
  // Flatten lines
  const lines = filteredCommits.flatMap((c) => c.lines);

  // Group lines by file
  let files = d3.groups(lines, (d) => d.file);
  // Sort descending by line count
  files.sort((a, b) => d3.descending(a[1].length, b[1].length));

  // Clear old
  d3.select('#files').selectAll('div').remove();

  // One <div> per file
  const fileEntries = d3.select('#files')
    .selectAll('div')
    .data(files)
    .join('div');

  // Column 1: file name
  fileEntries.append('code')
    .text(([file]) => file);

  // Column 2: lines as dots
  const dd = fileEntries.append('dd');

  // For each file, create one dot per line
  dd.selectAll('small')
    .data(([, lineObjects]) => lineObjects)
    .join('small')
    .attr('class', 'line-dot')
    .style('background', (line) => fileTypeColors(line.type));
  dd.append('code')
    .text(([file, lineObjects]) => `${lineObjects.length} lines`)
    .style('margin-right', '1em');
}

// 13) Update summary stats for the filtered commits (unused now)
function updateStats(filteredCommits) {
  const lines = filteredCommits.flatMap((c) => c.lines);

  // Remove old stats (so we can redraw them)
  d3.select('#stats').selectAll('*').remove();

  // Create a new <dl> for the updated stats
  const dl = d3.select('#stats')
    .append('dl')
    .attr('class', 'stats');

  // 1) Total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(lines.length);

  // 2) Total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(filteredCommits.length);

  // 3) Max File Length
  const maxFileLength = d3.max(lines, (d) => d.length);
  dl.append('dt').text('Max File Length');
  dl.append('dd').text(maxFileLength || 0);

  // 4) Number of unique authors
  const numAuthors = new Set(lines.map((d) => d.author)).size;
  dl.append('dt').text('Number of unique authors');
  dl.append('dd').text(numAuthors);

  // 5) Time of day most commits occur
  //    (Counting lines, or you can do a commit-level approach if you prefer)
  const workByPeriod = d3.rollups(
    lines,
    (v) => v.length,
    (d) => new Date(d.datetime).toLocaleString('en', { hour: 'numeric' })
  );
  if (workByPeriod.length > 0) {
    const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])[0];
    dl.append('dt').text('Time of day most commits occur');
    dl.append('dd').text(maxPeriod);
  }
}

// 14) Tooltip handling
function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const linesEdited = document.getElementById('commit-lines-edited');

  // If we have a valid commit
  if (commit && commit.id) {
    document.getElementById('commit-tooltip').style.display = 'block';
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleDateString('en', {
      dateStyle: 'full',
    });
    time.textContent = commit.time;
    author.textContent = commit.author;
    linesEdited.textContent = commit.totalLines;
  }
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  if (tooltip) {
    tooltip.hidden = !isVisible;
  }
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  if (tooltip) {
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
  }
}
