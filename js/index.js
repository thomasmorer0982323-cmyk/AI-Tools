async function loadAllData() {
    const [aiData, subcatCats, engineSubcats] = await Promise.all([
        loadAiData(),
        loadSubcategoryCategories(),
        loadEngineSubcategories()
    ]);
    return { aiData, subcatCats, engineSubcats };
}

function displayCategories() {
    loadAiData().then(data => {
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
            const category = engine.Category.toLowerCase();
            const subcats = engineSubcats.filter(es => es.Engine === engine.Engine).map(es => es.Subcategory.toLowerCase());
            const term = searchTerm.toLowerCase();

            return engineName.includes(term) || category.includes(term) || subcats.some(sub => sub.includes(term));
        });

        const uniqueEngines = [...new Map(filteredEngines.map(engine => [engine.Engine, engine])).values()];

        if (uniqueEngines.length === 0) {
            categoryList.innerHTML = '<p>No results found.</p>';
            return;
        }

        uniqueEngines.forEach(engine => {
            const card = document.createElement("div");
            card.className = "card";

            // Get unique subcategories for this engine
            const subcats = [...new Set(engineSubcats.filter(es => es.Engine === engine.Engine).map(es => es.Subcategory))];

            card.innerHTML = `
                <h3>${engine.Engine}</h3>
                <p><strong>Category:</strong> ${engine.Category}</p>
                <p><strong>Subcategories:</strong> ${subcats.join(', ')}</p>
            `;

            card.onclick = () => {
                window.location.href = `AIEngine.html?engine=${encodeURIComponent(engine.Engine)}`;
            };

            categoryList.appendChild(card);
        });
    });
}

// Initial load: display categories
displayCategories();

// Search functionality
document.getElementById('searchButton').addEventListener('click', () => {
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (searchTerm) {
        displaySearchResults(searchTerm);
    } else {
        displayCategories();
    }
});

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const searchTerm = document.getElementById('searchInput').value.trim();
        if (searchTerm) {
            displaySearchResults(searchTerm);
        } else {
            displayCategories();
        }
    }
});