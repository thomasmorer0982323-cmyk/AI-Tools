const csvDataCache = new Map();

function parseCsvText(csvText) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i += 1) {
        const char = csvText[i];

        if (char === '"') {
            if (inQuotes && csvText[i + 1] === '"') {
                field += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            row.push(field);
            field = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && csvText[i + 1] === '\n') {
                i += 1;
            }
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
            continue;
        }

        field += char;
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter(r => r.some(value => value && value.trim() !== ''));
}

async function loadCSV(filename, expectedHeaders = null) {

    if (csvDataCache.has(filename)) {
        return csvDataCache.get(filename);
    }

    const response = await fetch(`data/${filename}`);
    const data = await response.text();

    const rows = parseCsvText(data);
    if (!rows.length) {
        csvDataCache.set(filename, []);
        return [];
    }

    const firstRow = rows[0].map(value => (value || '').trim().replace(/^\uFEFF/, ''));
    const hasHeaderRow = expectedHeaders
        ? expectedHeaders.every((header, index) => (firstRow[index] || '').toLowerCase() === header.toLowerCase())
        : true;

    const headers = hasHeaderRow
        ? firstRow.map((header, index) => header || `H${index + 1}`)
        : (expectedHeaders || firstRow.map((header, index) => header || `H${index + 1}`));

    const dataRows = hasHeaderRow ? rows.slice(1) : rows;

    const parsedData = dataRows.map(values => {
        let obj = {};

        headers.forEach((header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
        });

        return obj;
    });

    csvDataCache.set(filename, parsedData);
    return parsedData;
}

async function loadAiData() {
    return loadCSV("AiData.csv", ["Engine", "weblink", "imagelink", "description", "Pros", "Cons"]);
}

async function loadSubcategoryCategories() {
    return loadCSV("SubcategoryCategories.csv", ["Subcategory", "Category"]);
}

async function loadEngineSubcategories() {
    return loadCSV("EngineSubcategories.csv", ["Engine", "Subcategory"]);
}
