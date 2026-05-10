function goBack() {
    window.location.href = "index.html";
}

const params = new URLSearchParams(window.location.search);

const engineName = params.get("engine");

Promise.all([loadAiData(), loadEngineSubcategories()]).then(([aiData, engineSubcats]) => {

    const engine = aiData.find(item =>
        item.Engine === engineName
    );

    document.getElementById("categoryName").innerText =
        engine.Category;

    document.getElementById("engineName").innerText =
        engine.Engine;

    document.getElementById("engineImage").src =
        `images/${engine.imagelink}`;

    document.getElementById("engineLink").href =
        engine.weblink;

    document.getElementById("engineLink").innerText =
        engine.weblink;

    document.getElementById("engineDescription").innerText =
        engine.description;

    // Display subcategories
    const subcategories = engineSubcats.filter(item => item.Engine === engineName).map(item => item.Subcategory);
    const subcatList = document.getElementById("subcategories");
    subcategories.forEach(subcat => {
        const li = document.createElement("li");
        li.innerText = subcat;
        subcatList.appendChild(li);
    });

});