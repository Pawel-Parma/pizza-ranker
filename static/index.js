let pizzas = [];
let rankedPizzas = [];
let isRanked = false;
let sortColumn = 'pricePerCm2';
let sortOrder = 'asc';
let editingIndex = -1;
let deletingIndex = -1;

// Touch handling variables
let startX = 0;
let currentX = 0;
let isSwiping = false;
let swipeThreshold = 100; // Minimum swipe distance to trigger action
let currentSwipingCard = null;

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
    pizza.id = Date.now(); // Add a unique ID to each pizza
    pizzas.push(pizza);
    calculateRanks();
    updateTable();
    updateCards();
    updateSortIndicators();

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
    return { name, amount, diameter, price, pricePerCm2, totalPrice };
}

function calculateRanks() {
    // Sort by price per square cm for value ranking
    const sortedByValue = [...pizzas].sort((a, b) => a.pricePerCm2 - b.pricePerCm2);

    // Assign value ranks with ties getting the same rank and proper skipping
    let currentRank = 1;
    let previousValue = null;
    let tieCount = 0;

    sortedByValue.forEach((pizza, index) => {
        // If this is a new value (not tied with previous), update the rank
        if (index === 0 || pizza.pricePerCm2 !== previousValue) {
            currentRank = index + 1; // This correctly accounts for skipped ranks after ties
            tieCount = 0;
        } else {
            // This is a tie with the previous value
            tieCount++;
        }

        pizza.valueRank = currentRank;
        previousValue = pizza.pricePerCm2;
    });

    // Sort by selected column for display order
    rankedPizzas = [...pizzas].sort((a, b) => {
        if (a[sortColumn] < b[sortColumn]) return sortOrder === 'asc' ? -1 : 1;
        if (a[sortColumn] > b[sortColumn]) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    // Assign display ranks with proper skipping after ties
    let displayRank = 1;
    let previousDisplayValue = null;
    let displayTieCount = 0;

    rankedPizzas.forEach((pizza, index) => {
        if (index === 0 || pizza[sortColumn] !== previousDisplayValue) {
            displayRank = index + 1; // This correctly accounts for skipped ranks after ties
            displayTieCount = 0;
        } else {
            // This is a tie with the previous value
            displayTieCount++;
        }

        pizza.rank = displayRank;
        previousDisplayValue = pizza[sortColumn];
    });
}

function toggleRanking() {
    isRanked = !isRanked;
    updateTable();
    updateCards();
}

function sortTable(column) {
    if (column === 'rank') {
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

function getRankColorClass(valueRank) {
    if (valueRank === 1) return 'rank-1';
    if (valueRank === 2) return 'rank-2';
    if (valueRank === 3) return 'rank-3';
    if (valueRank === 4) return 'rank-4';
    if (valueRank === 5) return 'rank-5';
    return 'rank-worst';
}

function updateTable() {
    const tableBody = document.getElementById("pizzaTable");
    tableBody.innerHTML = "";

    const displayList = isRanked ? rankedPizzas : pizzas;
    displayList.forEach((pizza, index) => {
        const row = document.createElement('tr');

        const rankCell = document.createElement('td');
        rankCell.textContent = pizza.rank || '-';

        if (pizza.valueRank > 5) {
            rankCell.className = 'rank-value-worst';
        } else {
            rankCell.className = `rank-value-${pizza.valueRank}`;
        }

        row.appendChild(rankCell);

        row.innerHTML += `
            <td>${pizza.name}</td>
            <td>${pizza.amount}</td>
            <td>${pizza.diameter}</td>
            <td>${pizza.price.toFixed(2)}</td>
            <td>${pizza.totalPrice.toFixed(2)}</td>
            <td>${pizza.pricePerCm2.toFixed(4)}</td>
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

    const displayList = isRanked ? rankedPizzas : pizzas;

    displayList.forEach((pizza, index) => {
        const card = document.createElement('div');

        let rankClass;
        if (pizza.valueRank > 5) {
            rankClass = 'rank-worst';
        } else {
            rankClass = `rank-${pizza.valueRank}`;
        }

        card.className = `pizza-card ${rankClass}`;
        card.dataset.index = index;

        // Add visible circular action icons outside the card
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

        // Add touch/swipe event listeners
        card.addEventListener('touchstart', handleTouchStart);
        card.addEventListener('touchmove', handleTouchMove);
        card.addEventListener('touchend', handleTouchEnd);

        cardsContainer.appendChild(card);
    });
}

// Edit and Delete Functions
function openEditModal(index) {
    const displayList = isRanked ? rankedPizzas : pizzas;
    const pizza = displayList[index];
    const actualIndex = pizzas.indexOf(pizza);
    editingIndex = actualIndex;

    document.getElementById("editName").value = pizza.name;
    document.getElementById("editAmount").value = pizza.amount;
    document.getElementById("editDiameter").value = pizza.diameter;
    document.getElementById("editPrice").value = pizza.price;
    document.getElementById("editIndex").value = actualIndex;

    // Ensure any open card is reset before showing the modal
    resetAllCards();
    document.getElementById("editModal").style.display = "flex";
}

function openDeleteModal(index) {
    const displayList = isRanked ? rankedPizzas : pizzas;
    const pizza = displayList[index];
    const actualIndex = pizzas.indexOf(pizza);
    deletingIndex = actualIndex;

    document.getElementById("pizzaToDeleteName").textContent = pizza.name;

    // Ensure any open card is reset before showing the modal
    resetAllCards();
    document.getElementById("deleteConfirmModal").style.display = "flex";
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
    resetAllCards(); // Always reset cards when closing a modal
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
    // Preserve the ID if it exists
    if (pizzas[editingIndex].id) {
        updatedPizza.id = pizzas[editingIndex].id;
    }

    pizzas[editingIndex] = updatedPizza;

    calculateRanks();
    updateTable();
    updateCards();
    closeModal('editModal');
}

function confirmDeletePizza() {
    pizzas.splice(deletingIndex, 1);
    calculateRanks();
    updateTable();
    updateCards();
    closeModal('deleteConfirmModal');
}

function deletePizza(index) {
    openDeleteModal(index);
}

// Touch handling functions
function handleTouchStart(e) {
    startX = e.touches[0].clientX;
    currentX = startX;
    isSwiping = true;

    // Store the card being swiped
    currentSwipingCard = e.currentTarget;
    currentSwipingCard.classList.add('swiping');

    // Reset any existing transformations
    currentSwipingCard.style.transform = 'translateX(0)';
}

function handleTouchMove(e) {
    if (!isSwiping || !currentSwipingCard) return;

    currentX = e.touches[0].clientX;
    const diffX = currentX - startX;

    // Apply the translation to follow the finger
    currentSwipingCard.style.transform = `translateX(${diffX}px)`;

    // Add visual indication of action based on swipe direction
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

function handleTouchEnd(e) {
    if (!isSwiping || !currentSwipingCard) return;

    const diffX = currentX - startX;
    const index = parseInt(currentSwipingCard.dataset.index);

    // Reset the card position
    currentSwipingCard.style.transform = 'translateX(0)';
    currentSwipingCard.classList.remove('swiping');
    currentSwipingCard.classList.remove('swipe-left-active', 'swipe-right-active');

    // Perform action based on swipe direction and distance
    if (diffX > swipeThreshold) {
        // Swiped right -> Edit
        setTimeout(() => openEditModal(index), 10);
    } else if (diffX < -swipeThreshold) {
        // Swiped left -> Delete
        setTimeout(() => deletePizza(index), 10);
    }

    // Reset flags
    isSwiping = false;
    currentSwipingCard = null;
}

// Helper function to reset all cards to their original position
function resetAllCards() {
    const cards = document.querySelectorAll('.pizza-card');
    cards.forEach(card => {
        card.style.transform = 'translateX(0)';
        card.classList.remove('swiping', 'swipe-left-active', 'swipe-right-active');
    });

    // Reset the global variables
    isSwiping = false;
    currentSwipingCard = null;
}

// Show info modal with custom message
function showInfoModal(message) {
    document.getElementById('infoMessage').textContent = message;
    document.getElementById('infoModal').style.display = 'flex';
}

// Initialize event listeners when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up button click handlers
    document.getElementById('addPizzaBtn').addEventListener('click', addPizza);
    document.getElementById('toggleRankingBtn').addEventListener('click', toggleRanking);

    // Prevent default form submission
    document.getElementById('pizzaForm').addEventListener('submit', function(event) {
        event.preventDefault();
        addPizza();
    });

    // Set up delete confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeletePizza);

    updateSortIndicators();
});

window.addEventListener('load', function() {
    updateSortIndicators();
});

// Close modal when clicking outside - with card reset for safety
window.onclick = function(event) {
    if (event.target === document.getElementById('editModal')) {
        closeModal('editModal');
        resetAllCards();
    }
    // Remove the delete modal background click handler to prevent it from closing
    if (event.target === document.getElementById('infoModal')) {
        closeModal('infoModal');
        resetAllCards();
    }
}

