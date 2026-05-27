function goBack() {
    window.location.href = 'index.html';
}

function goHome() {
    window.location.href = 'index.html';
}

const params = new URLSearchParams(window.location.search);

const category = params.get("category");

document.getElementById("categoryTitle").innerText = category;

Promise.all([loadSubcategoryCategories(), loadEngineSubcategories()]).then(([subcatCats, engineSubcats]) => {

    const subcategories = subcatCats.filter(item => item.Category === category).map(item => item.Subcategory);

    const engineList = document.getElementById("engineList");

    subcategories.forEach(subcategory => {

        const card = document.createElement("a");

        card.className = "card";
        card.href = `AISubcat.html?subcategory=${encodeURIComponent(subcategory)}&category=${encodeURIComponent(category)}`;

        card.innerHTML = `
            <h3>${subcategory}</h3>
        `;

        engineList.appendChild(card);

    });

});