import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function displayLatestProjects() {
    const projects = await fetchJSON('./lib/projects.json'); // Fetch all projects
    const latestProjects = projects.slice(0, 3); // Get the first 3 projects
    const projectsContainer = document.querySelector('.projects'); // Select the container

    if (projectsContainer) {
        renderProjects(latestProjects, projectsContainer, 'h2');
    }
}

displayLatestProjects();

const githubData = await fetchGitHubData('OldManBedroom'); // Replace with your username

const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
    profileStats.innerHTML = `
          <dl>
            <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
            <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
            <dt>Followers:</dt><dd>${githubData.followers}</dd>
            <dt>Following:</dt><dd>${githubData.following}</dd>
          </dl>
      `;
  }