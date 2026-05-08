async function loadCSV(filename) {

    const response = await fetch(`data/${filename}`);
    const data = await response.text();

    const rows = data.trim().split("\n");

    const headers = rows[0].split(",");

    return rows.slice(1).map(row => {

        const values = row.split(",");

        let obj = {};

        headers.forEach((header, index) => {
            obj[header.trim()] = values[index].trim();
        });

        return obj;
    });
}

async function loadAiData() {
    return loadCSV("AiData.csv");
}

async function loadSubcategoryCategories() {
    return loadCSV("SubcategoryCategories.csv");
}

async function loadEngineSubcategories() {
    return loadCSV("EngineSubcategories.csv");
}