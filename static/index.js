let pizzas = [];
let rankedPizzas = [];
let sortColumn = 'pricePerCm2';
let sortOrder = 'asc';
let editingIndex = -1;
let deletingIndex = -1;


let startX = 0;
let currentX = 0;
let isSwiping = false;
let swipeThreshold = 100;
let currentSwipingCard = null;


function encodePizzasToUrl() {
    if (pizzas.length === 0) return null;

   
    const simplePizzas = pizzas.map(p => ({
        n: p.name,
        a: p.amount,
        d: p.diameter,
        p: p.price
    }));

   
    return encodeURIComponent(JSON.stringify(simplePizzas));
}

function decodePizzasFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('data');

    if (!encodedData) return null;

    try {
        const simplePizzas = JSON.parse(decodeURIComponent(encodedData));

       
        return simplePizzas.map(sp => calculatePizza(sp.n, sp.a, sp.d, sp.p));
    } catch (e) {
        console.error("Error decoding pizza data from URL:", e);
        return null;
    }
}

function updateUrlWithPizzaData() {
    const encodedData = encodePizzasToUrl();
    if (!encodedData) {
       
        history.replaceState({}, '', window.location.pathname);
        return;
    }

   
    const url = new URL(window.location.href);
    url.search = `?data=${encodedData}`;
    history.replaceState({}, '', url.href);
}

function generateShareableLink() {
    const encodedData = encodePizzasToUrl();
    if (!encodedData) {
        showInfoModal("Add at least one pizza before sharing.");
        return null;
    }

    const url = new URL(window.location.href);
    url.search = `?data=${encodedData}`;
    return url.href;
}

function animateShareButton() {
    const shareBtn = document.getElementById('shareBtn');

    if (pizzas.length === 0) {
        showInfoModal("Add at least one pizza before sharing.");
        return;
    }

    const link = generateShareableLink();
    if (!link) return;
   
    if (shareBtn.classList.contains('copied') ||
        shareBtn.hasAttribute('data-animating')) {
        return;
    }

    navigator.clipboard.writeText(link).then(() => {
        // Add copied class to trigger the slide animation
        shareBtn.classList.add('copied');

        // Wait for animation to complete before reverting
        setTimeout(() => {
            // Add animating attribute to control return animation
            shareBtn.setAttribute('data-animating', 'returning');
            shareBtn.classList.remove('copied');

            // Remove the animating attribute when animation completes
            setTimeout(() => {
                shareBtn.removeAttribute('data-animating');
            }, 500); // Match this with the animation duration in CSS
        }, 1500); // Extend this time to show the success state longer
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showInfoModal("Failed to copy to clipboard. Please try again.");
    });
}

function addPizza() {
    const name = document.getElementById("name").value;
    const amount = parseInt(document.getElementById("amount").value);
    const diameter = parseFloat(document.getElementById("diameter").value);
    const price = parseFloat(document.getElementById("price").value);

    if (!validateInputs(name, amount, diameter, price)) {
        showInfoModal("Please fill out all fields with valid values. Name must not be empty, and numeric values must be positive numbers.");
        return;
    }

    const pizza = calculatePizza(name, amount, diameter, price);
    pizza.id = Date.now();
    pizzas.push(pizza);
    calculateRanks();
    updateTable();
    updateCards();
    updateSortIndicators();
    updateUrlWithPizzaData();

    document.getElementById("name").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("diameter").value = "";
    document.getElementById("price").value = "";
}

function validateInputs(name, amount, diameter, price) {
    return name.trim() !== "" && !isNaN(amount) && !isNaN(diameter) && !isNaN(price) && amount > 0 && diameter > 0 && price >= 0;
}

function calculatePizza(name, amount, diameter, price) {
    const radius = diameter / 2;
    const area = Math.PI * Math.pow(radius, 2) * amount;
    const pricePerCm2 = price * amount / area;
    const totalPrice = price * amount;
    return { name, amount, diameter, price, pricePerCm2, totalPrice, totalArea: area };
}

function calculateRanks() {
    rankedPizzas = [...pizzas].sort((a, b) => {
        if (a[sortColumn] < b[sortColumn]) return sortOrder === 'asc' ? -1 : 1;
        if (a[sortColumn] > b[sortColumn]) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    let uniqueValues = new Set(pizzas.map(pizza => pizza[sortColumn]));
    let maxRank = uniqueValues.size;

    let displayRank = 0;
    let sameValueCount = 0;
    let previousValue = null;


    rankedPizzas.forEach((pizza, index) => {
        const currentValue = pizza[sortColumn];

        if (index === 0 || Math.abs(currentValue - previousValue) > 0.00001) {
            // New value, so assign rank based on position
            displayRank += 1;
            sameValueCount = 0;
        } else {
            sameValueCount++;
        }

        pizza.rank = displayRank;
        previousValue = currentValue;
        if (sortColumn === 'pricePerCm2' || sortColumn === 'price' || sortColumn === 'totalPrice') {
            if (sortOrder === 'asc') {
                pizza.valueRank = Math.min(displayRank, 6);
            } else {
                pizza.valueRank = Math.min(maxRank + 1 - displayRank, 6);
            }
        } else {
             if (sortOrder === 'asc') {
                pizza.valueRank = Math.min(maxRank + 1 - displayRank, 6);
            } else {
                pizza.valueRank = Math.min(displayRank, 6);
            }
        }
    });
}

function sortTable(column) {
    if (column === 'rank' || column === 'name') {
        return;
    }

    if (sortColumn === column) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortOrder = 'asc';
    }
    calculateRanks();
    updateTable();
    updateCards();
    updateSortIndicators();
}

function updateSortIndicators() {
    const headers = document.querySelectorAll('th.sortable');
    headers.forEach(header => {
        header.classList.remove('sort-active', 'sort-asc', 'sort-desc');
    });

    const activeHeader = document.getElementById(`sort-${sortColumn}`);
    if (activeHeader) {
        activeHeader.classList.add('sort-active');
        activeHeader.classList.add(sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
    }
}

function updateTable() {
    const tableBody = document.getElementById("pizzaTable");
    tableBody.innerHTML = "";

    const displayList = rankedPizzas;
    displayList.forEach((pizza, _) => {
        const row = document.createElement('tr');

        const rankCell = document.createElement('td');
        rankCell.textContent = pizza.rank || '-';
        rankCell.className = `rank-value-${pizza.valueRank}`;

        row.appendChild(rankCell);

        row.innerHTML += `
            <td>${pizza.name}</td>
            <td>${pizza.amount}</td>
            <td>${pizza.diameter} cm²</td>
            <td>${pizza.price.toFixed(2)}</td>
            <td>${pizza.pricePerCm2.toFixed(4)}</td>
            <td>${Math.round(pizza.totalArea).toFixed(0)} cm²</td>
            <td>${pizza.totalPrice.toFixed(2)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="openEditModal(${displayList.indexOf(pizza)})" title="Edit">
                        <i class="material-icons">edit</i>
                    </button>
                    <button class="btn-delete" onclick="deletePizza(${displayList.indexOf(pizza)})" title="Delete">
                        <i class="material-icons">delete</i>
                    </button>
                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

function updateCards() {
    const cardsContainer = document.getElementById("pizzaCards");
    cardsContainer.innerHTML = "";

    rankedPizzas.forEach((pizza, index) => {
        const card = document.createElement('div');

        let rankClass;
        rankClass = `rank-${pizza.valueRank}`;

        card.className = `pizza-card ${rankClass}`;
        card.dataset.index = index;

        card.innerHTML = `
            <div class="swipe-action-visible edit-icon-visible">
                <i class="material-icons swipe-icon-edit">edit</i>
            </div>
            <div class="swipe-action-visible delete-icon-visible">
                <i class="material-icons swipe-icon-delete">delete</i>
            </div>
            <div class="swipe-indicator swipe-left-indicator">
                <i class="material-icons swipe-icon">edit</i>
            </div>
            <div class="swipe-indicator swipe-right-indicator">
                <i class="material-icons swipe-icon">delete</i>
            </div>
            <div class="card-header">
                <div class="pizza-name">${pizza.name}</div>
                <div class="pizza-rank ${rankClass}">${pizza.rank || '-'}</div>
            </div>
            <div class="pizza-details">
                <div class="detail-row">
                    <div class="detail-label">Amount</div>
                    <div class="detail-value">${pizza.amount}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Diameter</div>
                    <div class="detail-value">${pizza.diameter}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Price</div>
                    <div class="detail-value">${pizza.price.toFixed(2)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Total</div>
                    <div class="detail-value">${pizza.totalPrice.toFixed(2)}</div>
                </div>
            </div>
            <div class="price-per-cm2">
                <div class="detail-label">Price per cm²</div>
                <div class="detail-value">${pizza.pricePerCm2.toFixed(4)}</div>
            </div>
        `;

       
        card.addEventListener('touchstart', handleTouchStart);
        card.addEventListener('touchmove', handleTouchMove);
        card.addEventListener('touchend', handleTouchEnd);

        cardsContainer.appendChild(card);
    });
}


function openEditModal(index) {
    const pizza = rankedPizzas[index];
    const actualIndex = pizzas.indexOf(pizza);
    editingIndex = actualIndex;

    document.getElementById("editName").value = pizza.name;
    document.getElementById("editAmount").value = pizza.amount;
    document.getElementById("editDiameter").value = pizza.diameter;
    document.getElementById("editPrice").value = pizza.price;
    document.getElementById("editIndex").value = actualIndex;

   
    resetAllCards();
    document.getElementById("editModal").style.display = "flex";
}

function openDeleteModal(index) {
    const pizza = rankedPizzas[index];
    deletingIndex = pizzas.indexOf(pizza);

    document.getElementById("pizzaToDeleteName").textContent = pizza.name;

   
    resetAllCards();
    document.getElementById("deleteConfirmModal").style.display = "flex";
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);

    modal.style.opacity = '0';

    setTimeout(() => {
        modal.style.display = "none";
        modal.style.opacity = '';
    }, 300);

    resetAllCards();
}

function savePizzaEdit() {
    const name = document.getElementById("editName").value;
    const amount = parseInt(document.getElementById("editAmount").value);
    const diameter = parseFloat(document.getElementById("editDiameter").value);
    const price = parseFloat(document.getElementById("editPrice").value);

    if (!validateInputs(name, amount, diameter, price)) {
        showInfoModal("Please fill out all fields with valid values. Name must not be empty, and numeric values must be positive numbers.");
        return;
    }

    const updatedPizza = calculatePizza(name, amount, diameter, price);
   
    if (pizzas[editingIndex].id) {
        updatedPizza.id = pizzas[editingIndex].id;
    }

    pizzas[editingIndex] = updatedPizza;

    calculateRanks();
    updateTable();
    updateCards();
    updateUrlWithPizzaData();
    closeModal('editModal');
}

function confirmDeletePizza() {
    pizzas.splice(deletingIndex, 1);
    calculateRanks();
    updateTable();
    updateCards();
    updateUrlWithPizzaData();
    closeModal('deleteConfirmModal');
}

function deletePizza(index) {
    openDeleteModal(index);
}


function handleTouchStart(e) {
    startX = e.touches[0].clientX;
    currentX = startX;
    isSwiping = true;

   
    currentSwipingCard = e.currentTarget;
    currentSwipingCard.classList.add('swiping');

   
    currentSwipingCard.style.transform = 'translateX(0)';
}

function handleTouchMove(e) {
    if (!isSwiping || !currentSwipingCard) return;

    currentX = e.touches[0].clientX;
    const diffX = currentX - startX;

   
    const resistance = 0.7;
    const translateX = diffX * resistance;
    currentSwipingCard.style.transform = `translateX(${translateX}px)`;

   
    if (diffX > 0) {
        currentSwipingCard.classList.add('swipe-left-active');
        currentSwipingCard.classList.remove('swipe-right-active');
    } else if (diffX < 0) {
        currentSwipingCard.classList.add('swipe-right-active');
        currentSwipingCard.classList.remove('swipe-left-active');
    } else {
        currentSwipingCard.classList.remove('swipe-left-active', 'swipe-right-active');
    }
}

function handleTouchEnd(_) {
    if (!isSwiping || !currentSwipingCard) return;

    const diffX = currentX - startX;
    const index = currentSwipingCard.dataset.index;

   
    currentSwipingCard.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    currentSwipingCard.style.transform = 'translateX(0) rotate(0deg)';

   
    setTimeout(() => {
        if (currentSwipingCard) {
            currentSwipingCard.style.transition = '';
        }
    }, 300);

    currentSwipingCard.classList.remove('swiping');
    currentSwipingCard.classList.remove('swipe-left-active', 'swipe-right-active');

   
    if (diffX > swipeThreshold) {
       
       
        setTimeout(() => openEditModal(index), 310);
    } else if (diffX < -swipeThreshold) {
       
       
        setTimeout(() => deletePizza(index), 310);
    }

   
    isSwiping = false;
    currentSwipingCard = null;
}


function resetAllCards() {
    const cards = document.querySelectorAll('.pizza-card');
    cards.forEach(card => {
        card.style.transform = 'translateX(0)';
        card.classList.remove('swiping', 'swipe-left-active', 'swipe-right-active');
    });

   
    isSwiping = false;
    currentSwipingCard = null;
}


function showInfoModal(message) {
    document.getElementById('infoMessage').textContent = message;
    document.getElementById('infoModal').style.display = 'flex';
}


document.addEventListener('DOMContentLoaded', function() {
   
    document.getElementById('addPizzaBtn').addEventListener('click', addPizza);

   
    document.getElementById('shareBtn').addEventListener('click', animateShareButton);

   
    document.getElementById('pizzaForm').addEventListener('submit', function(event) {
        event.preventDefault();
        addPizza();
    });

   
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeletePizza);

   
    const urlPizzas = decodePizzasFromUrl();
    if (urlPizzas && urlPizzas.length > 0) {
        pizzas = urlPizzas;
        calculateRanks();
        updateTable();
        updateCards();
    }

    updateSortIndicators();
});

window.addEventListener('load', function() {
    updateSortIndicators();
});


window.onclick = function(event) {
    if (event.target === document.getElementById('editModal')) {
        closeModal('editModal');
        resetAllCards();
    }

    if (event.target === document.getElementById('infoModal')) {
        closeModal('infoModal');
        resetAllCards();
    }
}
