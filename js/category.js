function goBack() {
    window.location.href = "index.html";
}

const params = new URLSearchParams(window.location.search);

const category = params.get("category");

document.getElementById("categoryTitle").innerText = category;

Promise.all([loadSubcategoryCategories(), loadEngineSubcategories()]).then(([subcatCats, engineSubcats]) => {

    const subcategories = subcatCats.filter(item => item.Category === category).map(item => item.Subcategory);

    const engineList = document.getElementById("engineList");

    subcategories.forEach(subcategory => {

        const card = document.createElement("div");

        card.className = "card";

        card.innerHTML = `
            <h3>${subcategory}</h3>
        `;

        card.onclick = () => {

            window.location.href =
                `AISubcat.html?subcategory=${encodeURIComponent(subcategory)}`;

        };

        engineList.appendChild(card);

    });

});