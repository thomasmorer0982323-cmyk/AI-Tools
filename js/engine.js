function goBack() {
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from');

    if (from === 'subcat') {
        const subcategory = params.get('subcategory');
        const category = params.get('category');
        if (subcategory) {
            let url = `AISubcat.html?subcategory=${encodeURIComponent(subcategory)}`;
            if (category) {
                url += `&category=${encodeURIComponent(category)}`;
            }
            window.location.href = url;
            return;
        }
    }

    if (from === 'category') {
        const category = params.get('category');
        if (category) {
            window.location.href = `AICat.html?category=${encodeURIComponent(category)}`;
            return;
        }
    }

    if (from === 'search') {
        const searchTerm = params.get('search');
        if (searchTerm) {
            window.location.href = `index.html?search=${encodeURIComponent(searchTerm)}`;
            return;
        }
    }

    window.history.back();
}

function goHome() {
    window.location.href = 'index.html';
}

function getEngineSubcategories(engineName, engineSubcats) {
    return [...new Set(engineSubcats.filter(es => es.Engine === engineName).map(es => es.Subcategory))];
}

function getEngineCategories(engineName, subcatCats, engineSubcats) {
    const subcategories = getEngineSubcategories(engineName, engineSubcats);
    return [...new Set(subcategories.map(subcat => {
        const mapping = subcatCats.find(item => item.Subcategory === subcat);
        return mapping ? mapping.Category : '';
    }).filter(Boolean))];
}

function renderFeatureList(rawValue, listId, itemClass) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = '';
    if (!rawValue) {
        const emptyItem = document.createElement('li');
        emptyItem.className = itemClass;
        emptyItem.textContent = 'No items available.';
        list.appendChild(emptyItem);
        return;
    }

    const values = rawValue.split(';').map(item => item.trim()).filter(Boolean);
    values.forEach(rawText => {
        const [preview, ...rest] = rawText.split('_');
        const detail = rest.join('_').trim();
        const item = document.createElement('li');
        item.className = itemClass;
        item.innerHTML = `<span class="feature-preview">${escapeHtml(preview.replace(/_/g, ' '))}</span>`;

        if (detail) {
            const indicator = document.createElement('span');
            indicator.className = 'feature-indicator';
            indicator.textContent = 'v';//↓' // ▼';
            item.appendChild(indicator);

            const detailSpan = document.createElement('span');
            detailSpan.className = 'feature-detail';
            detailSpan.textContent = escapeHtml(detail.replace(/_/g, ' '));
            item.appendChild(detailSpan);

            item.addEventListener('click', () => {
                item.classList.toggle('expanded');
            });
        }

        list.appendChild(item);
    });
}

let slideshowInterval;
let slideshowAnimationTimeout;

const slideshowExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
const slideshowDisplayMs = 2000;
const slideshowTransitionMs = 2000;
const maxSlideshowImages = 12;

function normalizeImageBaseName(filename) {
    return filename
        .replace(/\.[^.]+$/, '')
        .replace(/\d+$/, '')
        .replace(/[^a-z0-9]+/gi, '')
        .toLowerCase();
}

function getEngineImagePrefixes(engineTitle) {
    const rawValue = (engineTitle || '').trim().toLowerCase();
    const compactValue = rawValue.replace(/[^a-z0-9]+/g, '');
    const underscoreValue = rawValue.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const hyphenValue = rawValue.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    return [...new Set([compactValue, underscoreValue, hyphenValue].filter(Boolean))];
}

function probeImage(src) {
    return new Promise(resolve => {
        const image = new Image();
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = src;
    });
}

async function findExistingImage(prefix, suffix) {
    for (const extension of slideshowExtensions) {
        const candidate = `imagesSlideshow/${prefix}${suffix}.${extension}`;
        if (await probeImage(candidate)) {
            return candidate;
        }
    }

    return null;
}

async function discoverSlideshowImages(engineTitle) {
    const prefixes = getEngineImagePrefixes(engineTitle);
    const discoveredImages = [];
    const seenImages = new Set();

    for (const prefix of prefixes) {
        const baseImage = await findExistingImage(prefix, '');
        if (baseImage && !seenImages.has(baseImage)) {
            seenImages.add(baseImage);
            discoveredImages.push(baseImage);
        }

        for (let index = 1; index <= maxSlideshowImages; index += 1) {
            const numberedImage = await findExistingImage(prefix, String(index));
            if (!numberedImage) {
                if (index > 1) {
                    break;
                }
                continue;
            }

            if (!seenImages.has(numberedImage)) {
                seenImages.add(numberedImage);
                discoveredImages.push(numberedImage);
            }
        }
    }

    return discoveredImages;
}

function resetSlideshowLayer(imageElement) {
    imageElement.className = 'engine-image engine-image-layer';
}

function setSlideshowImage(imageElement, imageSrc, engineTitle, imageNumber) {
    imageElement.src = imageSrc;
    imageElement.alt = `${engineTitle} image ${imageNumber}`;
}

async function setupEngineSlideshow(engineTitle) {
    const slideshow = document.getElementById('engineSlideshow');
    let currentImage = document.getElementById('engineImageCurrent');
    let nextImage = document.getElementById('engineImageNext');

    if (!slideshow || !currentImage || !nextImage || !engineTitle) {
        return;
    }

    if (slideshowInterval) {
        clearTimeout(slideshowInterval);
        slideshowInterval = null;
    }

    if (slideshowAnimationTimeout) {
        clearTimeout(slideshowAnimationTimeout);
        slideshowAnimationTimeout = null;
    }

    const matchingImages = await discoverSlideshowImages(engineTitle);

    if (!matchingImages.length) {
        slideshow.classList.add('hidden');
        currentImage.removeAttribute('src');
        nextImage.removeAttribute('src');
        currentImage.alt = '';
        nextImage.alt = '';
        return;
    }

    let currentIndex = 0;
    resetSlideshowLayer(currentImage);
    resetSlideshowLayer(nextImage);
    setSlideshowImage(currentImage, matchingImages[currentIndex], engineTitle, currentIndex + 1);
    currentImage.classList.add('is-active');
    slideshow.classList.remove('hidden');

    if (matchingImages.length === 1) {
        return;
    }

    const queueNextSlide = () => {
        slideshowInterval = window.setTimeout(() => {
            const nextIndex = (currentIndex + 1) % matchingImages.length;
            resetSlideshowLayer(currentImage);
            resetSlideshowLayer(nextImage);
            setSlideshowImage(nextImage, matchingImages[nextIndex], engineTitle, nextIndex + 1);
            currentImage.classList.add('is-active');
            nextImage.classList.add('is-next');

            requestAnimationFrame(() => {
                currentImage.classList.add('slide-out-left');
                nextImage.classList.add('slide-in-right');
            });

            slideshowAnimationTimeout = window.setTimeout(() => {
                resetSlideshowLayer(currentImage);
                resetSlideshowLayer(nextImage);
                nextImage.classList.add('is-active');
                currentIndex = nextIndex;
                [currentImage, nextImage] = [nextImage, currentImage];
                queueNextSlide();
            }, slideshowTransitionMs);
        }, slideshowDisplayMs);
    };

    queueNextSlide();
}

const params = new URLSearchParams(window.location.search);

const engineName = params.get("engine");

Promise.all([loadAiData(), loadSubcategoryCategories(), loadEngineSubcategories()]).then(async ([aiData, subcatCats, engineSubcats]) => {

    const engine = aiData.find(item =>
        item.Engine === engineName
    );

    const categories = getEngineCategories(engineName, subcatCats, engineSubcats);
    document.getElementById("categoryName").innerText = categories.length ? categories.join(', ') : 'No category';

    document.getElementById("engineName").innerText =
        engine.Engine;

    await setupEngineSlideshow(engine.Engine);

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

    renderFeatureList(engine.Pros, "prosList", "pros-item");
    renderFeatureList(engine.Cons, "consList", "cons-item");

    await loadRatingInfo();

    document.getElementById("ratingForm").addEventListener("submit", async event => {
        event.preventDefault();
        const scoreValue = parseInt(document.getElementById("score").value, 10);
        const commentValue = document.getElementById("comment").value.trim();

        if (!scoreValue) {
            showRatingMessage("Kies eerst een score.", true);
            return;
        }

        try {
            const { s, cnt } = await submitRating(engineName, scoreValue, commentValue);
            showRatingMessage(` Thank you! Your rating has been saved.`, false);
            document.getElementById("score").value = "";
            document.getElementById("comment").value = "";
            document.getElementById("averageScore").innerText = `${s.toFixed(1)} / 5`;
            document.getElementById("ratingCount").innerText = `(${cnt} rating${cnt === 1 ? "" : "s"})`;
            await loadRatingInfo();
        } catch (error) {
            showRatingMessage("Could not save the rating. Please try again.", true);
        }
    });
});

async function loadRatingInfo() {
    try {
        const rating = await getRating(engineName);
        const averageScoreElement = document.getElementById("averageScore");
        const ratingCountElement = document.getElementById("ratingCount");

        if (rating.cnt > 0) {
            averageScoreElement.innerText = `${rating.s.toFixed(1)} / 5`;
            ratingCountElement.innerText = `(${rating.cnt} rating${rating.cnt === 1 ? "" : "s"})`;
        } else {
            averageScoreElement.innerText = "No ratings yet";
            ratingCountElement.innerText = "(No comments yet)";
        }

        renderComments(rating.comments || []);
    } catch (error) {
        console.error("Error loading rating:", error);
    }
}

function renderComments(comments) {
    const commentsList = document.getElementById("commentsList");
    commentsList.innerHTML = "";

    if (!comments.length) {
        commentsList.innerHTML = `<p class="no-comments">No comments yet.</p>`;
        return;
    }

    const sortedComments = comments.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    sortedComments.forEach(comment => {
        const commentItem = document.createElement("div");
        commentItem.className = "comment-item";
        const date = new Date(comment.timestamp).toLocaleDateString("nl-NL", { year: "numeric", month: "short", day: "numeric" });
        commentItem.innerHTML = `
            <div class="comment-meta">
                <span class="comment-score">Score: ${comment.score}/5</span>
                <span class="comment-date">${date}</span>
            </div>
            <p>${escapeHtml(comment.text)}</p>
        `;
        commentsList.appendChild(commentItem);
    });
}

function showRatingMessage(message, isError) {
    const messageElement = document.getElementById("ratingMessage");
    messageElement.textContent = message;
    messageElement.className = `rating-message ${isError ? "error" : "success"}`;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
