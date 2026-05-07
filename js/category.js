function goBack() {
    window.location.href = "index.html";
}

const params = new URLSearchParams(window.location.search);

const category = params.get("category");

document.getElementById("categoryTitle").innerText = category;

loadCSV().then(data => {

    const filtered = data.filter(item =>
        item.Category === category
    );

    const engineList = document.getElementById("engineList");

    filtered.forEach(engine => {

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

    });

});