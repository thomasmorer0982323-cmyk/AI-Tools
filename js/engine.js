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
const slideshowImageCache = new Map();
const slideshowProbeCache = new Map();

function normalizeImageBaseName(filename) {
    return filename
        .replace(/\.[^.]+$/, '')
        .replace(/\d+$/, '')
        .replace(/[^a-z0-9]+/gi, '')
        .toLowerCase();
}

function getEngineImagePrefixes(engineTitle, imageName) {
    return [...new Set([
        normalizeImageBaseName(imageName || ''),
        normalizeImageBaseName(engineTitle || '')
    ].filter(Boolean))];
}

function getPreferredExtensions(imageName) {
    const extensionMatch = (imageName || '').trim().toLowerCase().match(/\.([a-z0-9]+)$/);
    const preferredExtension = extensionMatch ? extensionMatch[1] : '';
    return [...new Set([preferredExtension, ...slideshowExtensions].filter(Boolean))];
}

function probeImage(src) {
    return new Promise(resolve => {
        if (slideshowImageCache.has(src)) {
            slideshowProbeCache.set(src, true);
            resolve(true);
            return;
        }

        if (slideshowProbeCache.has(src)) {
            resolve(slideshowProbeCache.get(src));
            return;
        }

        const image = new Image();
        image.onload = () => {
            slideshowImageCache.set(src, image);
            slideshowProbeCache.set(src, true);
            resolve(true);
        };
        image.onerror = () => {
            slideshowProbeCache.set(src, false);
            resolve(false);
        };
        image.src = src;
    });
}

async function preloadSlideshowImages(imageSources) {
    const preloadTasks = imageSources.map(src => new Promise(resolve => {
        if (slideshowImageCache.has(src)) {
            resolve();
            return;
        }

        const image = new Image();
        image.onload = () => {
            slideshowImageCache.set(src, image);
            resolve();
        };
        image.onerror = () => resolve();
        image.src = src;
    }));

    await Promise.all(preloadTasks);
}

async function findExistingImage(folderName, prefix, suffix, extensionsToTry) {
    for (const extension of extensionsToTry) {
        const candidate = `${folderName}/${prefix}${suffix}.${extension}`;
        if (await probeImage(candidate)) {
            return candidate;
        }
    }

    return null;
}

async function discoverSlideshowImages(engineTitle, imageName) {
    const prefixes = getEngineImagePrefixes(engineTitle, imageName);
    const extensionsToTry = getPreferredExtensions(imageName);
    const discoveredImages = [];
    const seenImages = new Set();

    for (const prefix of prefixes) {
        const mainImage = await findExistingImage('images', prefix, '', extensionsToTry);
        if (mainImage && !seenImages.has(mainImage)) {
            seenImages.add(mainImage);
            discoveredImages.push(mainImage);
        }

        const slideshowBaseImage = await findExistingImage('imagesSlideshow', prefix, '', extensionsToTry);
        if (slideshowBaseImage && !seenImages.has(slideshowBaseImage)) {
            seenImages.add(slideshowBaseImage);
            discoveredImages.push(slideshowBaseImage);
        }

        for (let index = 1; index <= maxSlideshowImages; index += 1) {
            const numberedImage = await findExistingImage('imagesSlideshow', prefix, String(index), extensionsToTry);
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

async function setupEngineSlideshow(engineTitle, imageName) {
    const slideshow = document.getElementById('engineSlideshow');
    const previousButton = document.getElementById('enginePrevButton');
    const nextButton = document.getElementById('engineNextButton');
    let currentImage = document.getElementById('engineImageCurrent');
    let nextImage = document.getElementById('engineImageNext');

    if (!slideshow || !currentImage || !nextImage || !previousButton || !nextButton || !engineTitle) {
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

    const fallbackImage = imageName ? `images/${imageName.trim()}` : '';
    if (fallbackImage) {
        resetSlideshowLayer(currentImage);
        setSlideshowImage(currentImage, fallbackImage, engineTitle, 1);
        currentImage.classList.add('is-active');
        slideshow.classList.remove('hidden');
        previousButton.classList.add('hidden');
        nextButton.classList.add('hidden');
    }

    const matchingImages = await discoverSlideshowImages(engineTitle, imageName);

    if (!matchingImages.length) {
        slideshowImageCache.clear();
        if (!fallbackImage) {
            slideshow.classList.add('hidden');
            currentImage.removeAttribute('src');
            nextImage.removeAttribute('src');
            currentImage.alt = '';
            nextImage.alt = '';
        }
        return;
    }

    let currentIndex = 0;
    let isAnimating = false;

    const clearTimers = () => {
        if (slideshowInterval) {
            clearTimeout(slideshowInterval);
            slideshowInterval = null;
        }
        if (slideshowAnimationTimeout) {
            clearTimeout(slideshowAnimationTimeout);
            slideshowAnimationTimeout = null;
        }
    };

    const scheduleAutoNext = () => {
        clearTimers();
        if (matchingImages.length <= 1) {
            return;
        }

        slideshowInterval = window.setTimeout(() => {
            transitionTo((currentIndex + 1) % matchingImages.length, 'next');
        }, slideshowDisplayMs);
    };

    const transitionTo = (targetIndex, direction, animate = true) => {
        if (targetIndex === currentIndex) {
            return;
        }

        clearTimers();

        if (!animate) {
            resetSlideshowLayer(currentImage);
            resetSlideshowLayer(nextImage);
            setSlideshowImage(currentImage, matchingImages[targetIndex], engineTitle, targetIndex + 1);
            currentImage.classList.add('is-active');
            currentIndex = targetIndex;
            isAnimating = false;
            scheduleAutoNext();
            return;
        }

        if (isAnimating) {
            return;
        }

        isAnimating = true;

        resetSlideshowLayer(currentImage);
        resetSlideshowLayer(nextImage);
        setSlideshowImage(nextImage, matchingImages[targetIndex], engineTitle, targetIndex + 1);
        currentImage.classList.add('is-active');
        nextImage.classList.add('is-next');

        requestAnimationFrame(() => {
            if (direction === 'prev') {
                currentImage.classList.add('slide-out-right');
                nextImage.classList.add('slide-in-left');
            } else {
                currentImage.classList.add('slide-out-left');
                nextImage.classList.add('slide-in-right');
            }
        });

        slideshowAnimationTimeout = window.setTimeout(() => {
            resetSlideshowLayer(currentImage);
            resetSlideshowLayer(nextImage);
            nextImage.classList.add('is-active');
            currentIndex = targetIndex;
            [currentImage, nextImage] = [nextImage, currentImage];
            isAnimating = false;
            scheduleAutoNext();
        }, slideshowTransitionMs);
    };

    resetSlideshowLayer(currentImage);
    resetSlideshowLayer(nextImage);
    setSlideshowImage(currentImage, matchingImages[currentIndex], engineTitle, currentIndex + 1);
    currentImage.classList.add('is-active');
    slideshow.classList.remove('hidden');

    preloadSlideshowImages(matchingImages).catch(() => { });

    if (matchingImages.length === 1) {
        previousButton.classList.add('hidden');
        nextButton.classList.add('hidden');
        return;
    }

    previousButton.classList.remove('hidden');
    nextButton.classList.remove('hidden');

    previousButton.onclick = () => {
        const previousIndex = (currentIndex - 1 + matchingImages.length) % matchingImages.length;
        transitionTo(previousIndex, 'prev', false);
    };

    nextButton.onclick = () => {
        const nextIndex = (currentIndex + 1) % matchingImages.length;
        transitionTo(nextIndex, 'next', false);
    };

    scheduleAutoNext();
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

    setupEngineSlideshow(engine.Engine, engine.imagelink);

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
