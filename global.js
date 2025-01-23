console.log('IT’S ALIVE!');

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

// let navLinks = $$('nav a');

// // Find the link for the current page
// let currentLink = navLinks.find(
//     (a) => a.host === location.host && a.pathname === location.pathname
// );

// // Add the 'current' class to the current page link (if found)
// currentLink?.classList.add('current');

// Define pages
let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'https://github.com/OldManBedroom', title: 'Github Profile' },
    { url: 'resume/', title: 'Resume' },
];

// Detect if on the home page
const ARE_WE_HOME = document.documentElement.classList.contains('home');

// Create and add the navigation menu
let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    if (!ARE_WE_HOME && !url.startsWith('http')) {
        url = '../' + url;
    }

    let title = p.title;
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);
    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
    }
    
    if (a.host !== location.host) {
        a.target = '_blank';
    }
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>
    `
);



const select = document.querySelector('.color-scheme select');

// Apply the saved scheme on page load
if ('colorScheme' in localStorage) {
    const savedScheme = localStorage.colorScheme;
    document.documentElement.style.setProperty('color-scheme', savedScheme); // Apply the saved scheme
    select.value = savedScheme; // Update the dropdown to match
}

// Save the user’s preference and apply the scheme on change
select.addEventListener('input', function (event) {
    const selectedScheme = event.target.value;
    document.documentElement.style.setProperty('color-scheme', selectedScheme); // Apply the value
    localStorage.colorScheme = selectedScheme; // Save to localStorage
});