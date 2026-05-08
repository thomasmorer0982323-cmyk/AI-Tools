function goBack() {
    history.back();
}

const params = new URLSearchParams(window.location.search);

const subcategory = params.get("subcategory");

document.getElementById("subcategoryTitle").innerText = subcategory;

Promise.all([loadAiData(), loadEngineSubcategories()]).then(([aiData, engineSubcats]) => {

    const engines = engineSubcats.filter(item => item.Subcategory === subcategory).map(item => item.Engine);

    const engineList = document.getElementById("engineList");

    engines.forEach(engineName => {

        const engine = aiData.find(item => item.Engine === engineName);

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

});