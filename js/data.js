async function loadCSV(filename) {

    const response = await fetch(`data/${filename}`);
    const data = await response.text();

    console.log(`Loading ${filename}, raw data length:`, data.length);

    const rows = data.trim().split("\n");

    console.log(`${filename} has ${rows.length} rows`);

    const headers = rows[0].split(",");

    console.log(`${filename} headers:`, headers);

    const parsedData = rows.slice(1).map(row => {

        const values = row.split(",");

        let obj = {};

        headers.forEach((header, index) => {
            obj[header.trim()] = values[index] ? values[index].trim() : '';
        });

        return obj;
    });

    console.log(`${filename} parsed ${parsedData.length} entries`);

    return parsedData;
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