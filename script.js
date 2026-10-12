const colors = ["#b7d881", "#f2b06e", "#82c6ba", "#d5a5d9", "#e58c7a"];
const boxRows = document.querySelector("#rows");
function addBoxRow(startValues = {}) {
    if (boxRows.children.length >= 5) {
        return;
    }

    const rowNumber = boxRows.children.length + 1;
    const row = document.createElement("div");
    row.className = "box-row";
    row.style.setProperty("--c", colors[rowNumber - 1]);

    row.innerHTML = `
        <div class="box-row-top">
            <span class="box-name">
                <i class="swatch"></i> Rozmiar ${rowNumber}
            </span>
            ${rowNumber > 1 ? `
                <button class="remove" type="button" aria-label="Usuń rozmiar">×</button>
            ` : ""}
        </div>
        <div class="box-inputs">
            <div class="input-wrap">
                <input type="number" min="0.1" step="0.1" class="box-l"
                    placeholder="Długość" value="${startValues.length || ""}"
                    aria-label="Długość kartonu">
                <span class="suffix">cm</span>
            </div>
            <div class="input-wrap">
                <input type="number" min="0.1" step="0.1" class="box-w"
                    placeholder="Szerokość" value="${startValues.width || ""}"
                    aria-label="Szerokość kartonu">
                <span class="suffix">cm</span>
            </div>
            <div class="input-wrap">
                <input type="number" min="1" step="1" class="box-q"
                    placeholder="Sztuki" value="${startValues.count || ""}"
                    aria-label="Liczba kartonów">
            </div>
        </div>
    `;

    const removeButton = row.querySelector(".remove");
    if (removeButton) {
        removeButton.addEventListener("click", function () {
            row.remove();
            updateRowNumbers();
        });
    }

    boxRows.append(row);
    updateRowNumbers();
}
function updateRowNumbers() {
    const allRows = boxRows.children;

    for (let i = 0; i < allRows.length; i++) {
        allRows[i].style.setProperty("--c", colors[i]);
        allRows[i].querySelector(".box-name").innerHTML =
            `<i class="swatch"></i> Rozmiar ${i + 1}`;
    }

    document.querySelector("#typeCount").textContent = `${allRows.length} / 5 rozmiarów`;
    document.querySelector("#addType").classList.toggle("hidden", allRows.length >= 5);
}
document.querySelector("#addType").addEventListener("click", function () {
    addBoxRow();
});
addBoxRow({ length: 40, width: 30, count: 12 });
function packBoxes(palletLength, palletWidth, boxes, canRotate, placeMode) {
    let freeSpaces = [{ x: 0, y: 0, width: palletLength, height: palletWidth }];
    const placedBoxes = [];

    for (const box of boxes) {
        let bestPlace = null;

        for (const space of freeSpaces) {
            const positions = [[box.width, box.height]];
            if (canRotate && box.width !== box.height) {
                positions.push([box.height, box.width]);
            }

            for (const [width, height] of positions) {
                if (width > space.width || height > space.height) {
                    continue;
                }

                const leftoverWidth = space.width - width;
                const leftoverHeight = space.height - height;
                const shortSide = Math.min(leftoverWidth, leftoverHeight);
                const longSide = Math.max(leftoverWidth, leftoverHeight);
                const leftoverArea = space.width * space.height - width * height;
                let score;

                if (placeMode === 0) {
                    score = shortSide * 100000 + longSide;
                } else if (placeMode === 1) {
                    score = leftoverArea;
                } else if (placeMode === 2) {
                    score = (space.y + height) * 100000 + space.x;
                } else {
                    score = longSide * 100000 + shortSide;
                }

                if (!bestPlace || score < bestPlace.score) {
                    bestPlace = {
                        x: space.x,
                        y: space.y,
                        width: width,
                        height: height,
                        score: score,
                        box: box
                    };
                }
            }
        }

        if (!bestPlace) {
            continue;
        }

        placedBoxes.push(bestPlace);
        const newSpaces = [];

        for (const space of freeSpaces) {
            const doesNotOverlap =
                bestPlace.x >= space.x + space.width ||
                bestPlace.x + bestPlace.width <= space.x ||
                bestPlace.y >= space.y + space.height ||
                bestPlace.y + bestPlace.height <= space.y;

            if (doesNotOverlap) {
                newSpaces.push(space);
                continue;
            }

            if (bestPlace.x > space.x) {
                newSpaces.push({
                    x: space.x,
                    y: space.y,
                    width: bestPlace.x - space.x,
                    height: space.height
                });
            }
            if (bestPlace.x + bestPlace.width < space.x + space.width) {
                newSpaces.push({
                    x: bestPlace.x + bestPlace.width,
                    y: space.y,
                    width: space.x + space.width - bestPlace.x - bestPlace.width,
                    height: space.height
                });
            }
            if (bestPlace.y > space.y) {
                newSpaces.push({
                    x: space.x,
                    y: space.y,
                    width: space.width,
                    height: bestPlace.y - space.y
                });
            }
            if (bestPlace.y + bestPlace.height < space.y + space.height) {
                newSpaces.push({
                    x: space.x,
                    y: bestPlace.y + bestPlace.height,
                    width: space.width,
                    height: space.y + space.height - bestPlace.y - bestPlace.height
                });
            }
        }

        freeSpaces = newSpaces.filter(function (space, index) {
            return !newSpaces.some(function (other, otherIndex) {
                const isDifferentSpace = index !== otherIndex;
                const isInsideOther =
                    space.x >= other.x &&
                    space.y >= other.y &&
                    space.x + space.width <= other.x + other.width &&
                    space.y + space.height <= other.y + other.height;
                return isDifferentSpace && isInsideOther;
            });
        });
    }

    return placedBoxes;
}
function calculatePlan() {
    const message = document.querySelector("#message");
    message.textContent = "";

    const palletLength = Number(document.querySelector("#palletL").value);
    const palletWidth = Number(document.querySelector("#palletW").value);

    if (palletLength <= 0 || palletWidth <= 0) {
        message.textContent = "Podaj prawidłowe wymiary palety.";
        return;
    }

    const boxTypes = Array.from(boxRows.children).map(function (row, index) {
        return {
            width: Number(row.querySelector(".box-l").value),
            height: Number(row.querySelector(".box-w").value),
            count: Number(row.querySelector(".box-q").value),
            color: colors[index],
            name: `Rozmiar ${index + 1}`
        };
    });

    const hasWrongValues = boxTypes.some(function (box) {
        return box.width <= 0 || box.height <= 0 ||
            box.count <= 0 || !Number.isInteger(box.count);
    });
    if (boxTypes.length === 0 || hasWrongValues) {
        message.textContent = "Uzupełnij wymiary i liczbę sztuk dla każdego rozmiaru.";
        return;
    }

    const cannotFit = boxTypes.some(function (box) {
        const fitsNormal = box.width <= palletLength && box.height <= palletWidth;
        const fitsTurned = box.height <= palletLength && box.width <= palletWidth;
        return !fitsNormal && !fitsTurned;
    });
    if (cannotFit) {
        message.textContent = "Jeden z kartonów jest większy od palety.";
        return;
    }

    const canRotate = document.querySelector("#rotate").checked;
    const possiblePlans = [];

    for (let sortMode = 0; sortMode < 5; sortMode++) {
        const boxes = [];
        for (const boxType of boxTypes) {
            for (let i = 0; i < boxType.count; i++) {
                boxes.push({ ...boxType });
            }
        }

        boxes.sort(function (a, b) {
            const areaA = a.width * a.height;
            const areaB = b.width * b.height;

            if (sortMode === 0) return areaB - areaA;
            if (sortMode === 1) return Math.max(b.width, b.height) - Math.max(a.width, a.height);
            if (sortMode === 2) return Math.min(b.width, b.height) - Math.min(a.width, a.height);
            if (sortMode === 3) return b.height - a.height || areaB - areaA;
            return b.width - a.width || areaB - areaA;
        });

        for (let placeMode = 0; placeMode < 4; placeMode++) {
            const plan = packBoxes(
                palletLength,
                palletWidth,
                boxes,
                canRotate,
                placeMode
            );
            possiblePlans.push(plan);
        }
    }

    possiblePlans.sort(function (planA, planB) {
        const areaA = planA.reduce((sum, box) => sum + box.width * box.height, 0);
        const areaB = planB.reduce((sum, box) => sum + box.width * box.height, 0);

        if (areaA !== areaB) {
            return areaB - areaA;
        }
        return planB.length - planA.length;
    });

    const bestPlan = possiblePlans[0];
    const placedCount = bestPlan.length;
    const usedArea = bestPlan.reduce((sum, box) => sum + box.width * box.height, 0);
    const totalCount = boxTypes.reduce((sum, box) => sum + box.count, 0);

    document.querySelector("#placed").textContent = placedCount.toLocaleString("pl-PL");
    document.querySelector("#coverage").textContent =
        `${(usedArea / (palletLength * palletWidth) * 100).toFixed(1).replace(".", ",")}%`;
    document.querySelector("#remaining").textContent =
        (totalCount - placedCount).toLocaleString("pl-PL");
    document.querySelector("#resultStatus").textContent = placedCount === totalCount
        ? "Ułożono wszystko"
        : `Ułożono ${placedCount} z ${totalCount}`;

    const palletArea = palletLength * palletWidth;
    const freeArea = palletArea - usedArea;
    const freePercent = (freeArea / palletArea * 100).toFixed(1).replace(".", ",");
    const leftOverText = totalCount > placedCount
        ? ` Nie zmieściło się ${totalCount - placedCount} kartonów.`
        : " Wszystkie kartony mieszczą się na palecie.";

    document.querySelector("#remaining").textContent =
        `${freeArea.toLocaleString("pl-PL")} cm²`;
    document.querySelector("#footnote").textContent =
        `Wolne miejsce: ${freeArea.toLocaleString("pl-PL")} cm² (${freePercent}% palety).` +
        leftOverText +
        " Program sprawdził kilka układów i wybrał ten z najmniejszą wolną powierzchnią.";

    drawPlan(palletLength, palletWidth, bestPlan, boxTypes);
}
function drawPlan(palletLength, palletWidth, placedBoxes, boxTypes) {
    const canvas = document.querySelector("#canvas");
    const viewWidth = 500;
    const viewHeight = 360;
    const padding = 14;
    const scale = Math.min(
        (viewWidth - padding * 2) / palletLength,
        (viewHeight - padding * 2) / palletWidth
    );
    const palletDrawWidth = palletLength * scale;
    const palletDrawHeight = palletWidth * scale;
    const left = (viewWidth - palletDrawWidth) / 2;
    const top = (viewHeight - palletDrawHeight) / 2;

    let svg = `
        <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img"
            aria-label="Widok palety z góry z rozmieszczonymi kartonami">
            <rect x="${left}" y="${top}" width="${palletDrawWidth}" height="${palletDrawHeight}"
                rx="5" fill="#e5c99d" stroke="#a68153" stroke-width="2" />
    `;
    for (let y = top + palletDrawHeight * 0.2; y < top + palletDrawHeight; y += palletDrawHeight * 0.2) {
        svg += `<path d="M${left} ${y}h${palletDrawWidth}" stroke="#a68153" stroke-opacity=".22" />`;
    }
    for (const box of placedBoxes) {
        const x = left + box.x * scale;
        const y = top + box.y * scale;
        const width = box.width * scale;
        const height = box.height * scale;
        const corner = Math.min(7, width / 8, height / 8);

        svg += `
            <rect x="${x + 1}" y="${y + 1}" width="${Math.max(0, width - 2)}"
                height="${Math.max(0, height - 2)}" rx="${corner}"
                fill="${box.box.color}" stroke="#314238" stroke-opacity=".4" />
        `;

        if (width > 28 && height > 20) {
            const label = box.box.name.replace("Rozmiar ", "R");
            svg += `<text x="${x + width / 2}" y="${y + height / 2 + 4}"
                text-anchor="middle" font-size="10" font-family="system-ui"
                fill="#26372d">${label}</text>`;
        }
    }

    svg += `
        <text x="${left + palletDrawWidth / 2}" y="${top - 7}"
            text-anchor="middle" font-size="12" fill="#68766d">${palletLength} cm</text>
        <text x="${left - 8}" y="${top + palletDrawHeight / 2}"
            text-anchor="middle" font-size="12" fill="#68766d"
            transform="rotate(-90 ${left - 8} ${top + palletDrawHeight / 2})">
            ${palletWidth} cm
        </text>
        </svg>
    `;

    canvas.classList.remove("empty");
    canvas.innerHTML = svg;

    const legend = document.querySelector("#legend");
    legend.innerHTML = boxTypes.map(function (box) {
        return `
            <span class="legend-item">
                <i class="legend-swatch" style="background:${box.color}"></i>
                ${box.name}: ${box.width} × ${box.height} cm
            </span>
        `;
    }).join("");
}

document.querySelector("#calculate").addEventListener("click", calculatePlan);



