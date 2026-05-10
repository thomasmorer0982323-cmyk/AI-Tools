async function loadAllData() {
    const [aiData, subcatCats, engineSubcats] = await Promise.all([
        loadAiData(),
        loadSubcategoryCategories(),
        loadEngineSubcategories()
    ]);
    return { aiData, subcatCats, engineSubcats };
}

function getEngineSubcategories(engineName, engineSubcats) {
    return [...new Set(engineSubcats
        .filter(es => es.Engine === engineName)
        .map(es => es.Subcategory))];
}

function getEngineCategories(engineName, subcatCats, engineSubcats) {
    const subcategories = getEngineSubcategories(engineName, engineSubcats);
    return [...new Set(subcategories
        .map(subcat => {
            const mapping = subcatCats.find(item => item.Subcategory === subcat);
            return mapping ? mapping.Category : '';
        })
        .filter(Boolean))];
}

function displayCategories() {
    loadSubcategoryCategories().then(data => {
        const categories = [...new Set(data.map(item => item.Category))];
        const categoryList = document.getElementById("categoryList");
        categoryList.innerHTML = ''; // Clear previous content

        categories.forEach(category => {
            const card = document.createElement("div");
            card.className = "card";
            card.innerText = category;
            card.onclick = () => {
                window.location.href = `AICat.html?category=${encodeURIComponent(category)}`;
            };
            categoryList.appendChild(card);
        });
    });
}

function displaySearchResults(searchTerm) {
    loadAllData().then(({ aiData, subcatCats, engineSubcats }) => {
        const categoryList = document.getElementById("categoryList");
        categoryList.innerHTML = ''; // Clear previous content

        // Filter engines based on search term
        const filteredEngines = aiData.filter(engine => {
            const engineName = engine.Engine.toLowerCase();
            const engineSubcategories = getEngineSubcategories(engine.Engine, engineSubcats).map(sub => sub.toLowerCase());
            const engineCategories = getEngineCategories(engine.Engine, subcatCats, engineSubcats).map(cat => cat.toLowerCase());
            const term = searchTerm.toLowerCase();

            return engineName.includes(term) || engineCategories.some(cat => cat.includes(term)) || engineSubcategories.some(sub => sub.includes(term));
        });

        const uniqueEngines = [...new Map(filteredEngines.map(engine => [engine.Engine, engine])).values()];

        if (uniqueEngines.length === 0) {
            categoryList.innerHTML = '<p>No results found.</p>';
            return;
        }

        uniqueEngines.forEach(engine => {
            const card = document.createElement("div");
            card.className = "card";

            const subcats = getEngineSubcategories(engine.Engine, engineSubcats);
            const categories = getEngineCategories(engine.Engine, subcatCats, engineSubcats);

            card.innerHTML = `
                <h3>${engine.Engine}</h3>
                <p><strong>Category:</strong> ${categories.join(', ')}</p>
                <p><strong>Subcategories:</strong> ${subcats.join(', ')}</p>
            `;

            card.onclick = () => {
                window.location.href = `AIEngine.html?engine=${encodeURIComponent(engine.Engine)}&from=search&search=${encodeURIComponent(searchTerm)}`;
            };

            categoryList.appendChild(card);
        });
    });
}

function updateSearchUrl(searchTerm) {
    if (searchTerm) {
        window.history.replaceState(null, '', `?search=${encodeURIComponent(searchTerm)}`);
    } else {
        window.history.replaceState(null, '', window.location.pathname);
    }
}

const initialSearchTerm = new URLSearchParams(window.location.search).get('search');
if (initialSearchTerm) {
    document.getElementById('searchInput').value = initialSearchTerm;
    displaySearchResults(initialSearchTerm);
} else {
    displayCategories();
}

// Search functionality
document.getElementById('searchButton').addEventListener('click', () => {
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (searchTerm) {
        updateSearchUrl(searchTerm);
        displaySearchResults(searchTerm);
    } else {
        updateSearchUrl('');
        displayCategories();
    }
});

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const searchTerm = document.getElementById('searchInput').value.trim();
        if (searchTerm) {
            updateSearchUrl(searchTerm);
            displaySearchResults(searchTerm);
        } else {
            updateSearchUrl('');
            displayCategories();
        }
    }
});