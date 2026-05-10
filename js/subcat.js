function goBack() {
    window.history.back();
}

const params = new URLSearchParams(window.location.search);

const subcategory = params.get("subcategory");

document.getElementById("subcategoryTitle").innerText = subcategory;

console.log("Subcategory from URL:", subcategory);

Promise.all([loadAiData(), loadEngineSubcategories()]).then(([aiData, engineSubcats]) => {

    console.log("Engine subcategories loaded:", engineSubcats.length);
    console.log("AI data loaded:", aiData.length);

    const engines = engineSubcats.filter(item => item.Subcategory === subcategory).map(item => item.Engine);

    console.log("Filtered engines for subcategory '" + subcategory + "':", engines);

    const engineList = document.getElementById("engineList");

    engines.forEach(engineName => {

        const engine = aiData.find(item => item.Engine === engineName);

        console.log("Looking for engine:", engineName, "Found:", !!engine);

        if (engine) {

            const card = document.createElement("div");

            card.className = "card";

            card.innerHTML = `
                <h3>${engine.Engine}</h3>
            `;

            card.onclick = () => {

                window.location.href =
                    `AIEngine.html?engine=${encodeURIComponent(engine.Engine)}`;

            };

            engineList.appendChild(card);

        }

    });

    console.log("Total cards created:", engineList.children.length);

});