function goBack() {
    history.back();
}

const params = new URLSearchParams(window.location.search);

const engineName = params.get("engine");

loadCSV().then(data => {

    const engine = data.find(item =>
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

});