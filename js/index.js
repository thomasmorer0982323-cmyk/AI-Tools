loadAiData().then(data => {

    const categories = [...new Set(data.map(item => item.Category))];

    const categoryList = document.getElementById("categoryList");

    categories.forEach(category => {

        const card = document.createElement("div");
        card.className = "card";

        card.innerText = category;

        card.onclick = () => {
            window.location.href =
                `AICat.html?category=${encodeURIComponent(category)}`;
        };

        categoryList.appendChild(card);
    });

});