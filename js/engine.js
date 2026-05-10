function goBack() {
    window.history.back();
}

const params = new URLSearchParams(window.location.search);

const engineName = params.get("engine");

Promise.all([loadAiData(), loadEngineSubcategories()]).then(async ([aiData, engineSubcats]) => {

    const engine = aiData.find(item =>
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

    // Display subcategories
    const subcategories = engineSubcats.filter(item => item.Engine === engineName).map(item => item.Subcategory);
    const subcatList = document.getElementById("subcategories");
    subcategories.forEach(subcat => {
        const li = document.createElement("li");
        li.innerText = subcat;
        subcatList.appendChild(li);
    });

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
