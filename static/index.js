const state = {
    pizzas: [],
    rankedPizzas: [],
    sortColumn: 'pricePerU2',
    sortOrder: 'asc',
    editingIndex: -1,
    deletingIndex: -1,
    swipe: {
        startX: 0,
        currentX: 0,
        isSwiping: false,
        threshold: 100,
        currentCard: null
    }
};


function encodePizzasToUrl() {
    if (state.pizzas.length === 0) return null;
   
    const simplePizzas = state.pizzas.map(p => ({
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
        return simplePizzas.map(sp => calculatePizzaData(sp.n, sp.a, sp.d, sp.p));
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

function validateInputs(name, amount, diameter, price) {
    return name.trim() !== "" && 
           !isNaN(amount) && 
           !isNaN(diameter) && 
           !isNaN(price) && 
           amount > 0 && 
           diameter > 0 && 
           price > 0;
}

function calculatePizzaData(name, amount, diameter, price) {
    const radius = diameter / 2;
    const area = Math.PI * Math.pow(radius, 2) * amount;
    const pricePerU2 = (price * amount) / area;
    const totalPrice = price * amount;
    
    return { 
        name, 
        amount, 
        diameter, 
        price, 
        pricePerU2, 
        totalPrice, 
        totalArea: area,
        id: Date.now()
    };
}

function calculateRanks() {
    state.rankedPizzas = [...state.pizzas].sort((a, b) => {
        const aValue = a[state.sortColumn];
        const bValue = b[state.sortColumn];
        
        if (aValue < bValue) return state.sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return state.sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    // Find number of unique values for the current sort column
    const uniqueValues = new Set(state.pizzas.map(pizza => pizza[state.sortColumn]));
    const maxRank = uniqueValues.size;

    let displayRank = 0;
    let previousValue = null;

    state.rankedPizzas.forEach((pizza, index) => {
        const currentValue = pizza[state.sortColumn];

        if (index === 0 || Math.abs(currentValue - previousValue) > 0.00001) {
            displayRank += 1;
        }

        pizza.rank = displayRank;
        previousValue = currentValue;

        const isPriceRelated = ['pricePerU2', 'price', 'totalPrice'].includes(state.sortColumn);
        
        if (isPriceRelated) {
            pizza.valueRank = state.sortOrder === 'asc' 
                ? Math.min(displayRank, 6) 
                : Math.min(maxRank + 1 - displayRank, 6);
        } else {
            pizza.valueRank = state.sortOrder === 'asc' 
                ? Math.min(maxRank + 1 - displayRank, 6) 
                : Math.min(displayRank, 6);
        }
        console.log(state.sortColumn);
    });
}

function animateShareButton() {
    const shareBtn = document.getElementById('shareBtn');

    if (state.pizzas.length === 0) {
        showInfoModal("Add at least one pizza before sharing.");
        return;
    }

    const link = generateShareableLink();
    if (!link) return;
   
    if (shareBtn.classList.contains('copied') || shareBtn.hasAttribute('data-animating')) {
        return;
    }

    navigator.clipboard.writeText(link)
        .then(() => {
            shareBtn.classList.add('copied');

            setTimeout(() => {
                shareBtn.setAttribute('data-animating', 'returning');
                shareBtn.classList.remove('copied');

                setTimeout(() => {
                    shareBtn.removeAttribute('data-animating');
                }, 500);
            }, 1000);
        })
        .catch(err => {
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

    const pizza = calculatePizzaData(name, amount, diameter, price);
    state.pizzas.push(pizza);
    
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

function sortTable(column) {
    if (column === 'rank' || column === 'name') {
        return;
    }

    if (state.sortColumn === column) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        state.sortColumn = column;
        state.sortOrder = 'asc';
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

    const activeHeader = document.getElementById(`sort-${state.sortColumn}`);
    if (activeHeader) {
        activeHeader.classList.add('sort-active');
        activeHeader.classList.add(state.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
        
        activeHeader.setAttribute('aria-sort', state.sortOrder === 'asc' ? 'ascending' : 'descending');
    }
}


function updateTable() {
    const tableBody = document.getElementById("pizzaTable");
    tableBody.innerHTML = "";

    state.rankedPizzas.forEach((pizza, index) => {
        const row = document.createElement('tr');

        const rankCell = document.createElement('td');
        rankCell.textContent = pizza.rank;
        rankCell.className = `rank-value-${pizza.valueRank}`;
        row.appendChild(rankCell);

        row.innerHTML += `
            <td>${pizza.name}</td>
            <td>${pizza.amount}</td>
            <td>${pizza.diameter}</td>
            <td>${pizza.price.toFixed(2)}</td>
            <td>${pizza.pricePerU2.toFixed(4)}</td>
            <td>${Math.round(pizza.totalArea)}</td>
            <td>${pizza.totalPrice.toFixed(2)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="openEditModal(${index})" title="Edit">
                        <i class="material-icons">edit</i>
                    </button>
                    <button class="btn-delete" onclick="deletePizza(${index})" title="Delete">
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

    state.rankedPizzas.forEach((pizza, index) => {
        const card = document.createElement('div');
        const rankClass = `rank-${pizza.valueRank}`;
        
        card.className = `pizza-card ${rankClass}`;
        card.dataset.index = index;

        card.innerHTML = `
            <div class="swipe-action-visible edit-icon-visible">
                <i class="material-icons swipe-icon-edit">edit</i>
            </div>
            <div class="swipe-action-visible delete-icon-visible">
                <i class="material-icons swipe-icon-delete">delete</i>
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
            <div class="price-per-u2">
                <div class="detail-label">Price per cm²</div>
                <div class="detail-value">${pizza.pricePerU2.toFixed(4)}</div>
            </div>
        `;

        card.addEventListener('touchstart', handleTouchStart);
        card.addEventListener('touchmove', handleTouchMove);
        card.addEventListener('touchend', handleTouchEnd);

        cardsContainer.appendChild(card);
    });
}


function openModal(modalId) {
    const modal = document.getElementById(modalId);
    
    modal.classList.remove('closing');
    
    void modal.offsetWidth;
    
    modal.style.display = "flex";
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    
    void modal.offsetWidth;
    
    modal.classList.add('closing');
    
    requestAnimationFrame(() => {
        setTimeout(() => {
            modal.style.display = "none";
            modal.classList.remove('closing');
        }, 100);
    });
    
    resetAllCards();
}


function showInfoModal(message) {
    document.getElementById('infoMessage').textContent = message;
    openModal('infoModal');
}


function openEditModal(index) {
    const pizza = state.rankedPizzas[index];
    const actualIndex = state.pizzas.indexOf(pizza);
    state.editingIndex = actualIndex;

    document.getElementById("editName").value = pizza.name;
    document.getElementById("editAmount").value = pizza.amount;
    document.getElementById("editDiameter").value = pizza.diameter;
    document.getElementById("editPrice").value = pizza.price;
    document.getElementById("editIndex").value = actualIndex;

    resetAllCards();
    openModal("editModal");
}

function openDeleteModal(index) {
    const pizza = state.rankedPizzas[index];
    state.deletingIndex = state.pizzas.indexOf(pizza);

    document.getElementById("pizzaToDeleteName").textContent = pizza.name;

    resetAllCards();
    openModal("deleteConfirmModal");
}

function deletePizza(index) {
    openDeleteModal(index);
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

    const updatedPizza = calculatePizzaData(name, amount, diameter, price);

    if (state.pizzas[state.editingIndex].id) {
        updatedPizza.id = state.pizzas[state.editingIndex].id;
    }

    state.pizzas[state.editingIndex] = updatedPizza;

    closeModal('editModal');
    calculateRanks();
    updateTable();
    updateCards();
    updateUrlWithPizzaData();
}

function confirmDeletePizza() {
    state.pizzas.splice(state.deletingIndex, 1);
    
    closeModal('deleteConfirmModal');
    calculateRanks();
    updateTable();
    updateCards();
    updateUrlWithPizzaData();
}


function handleTouchStart(e) {
    state.swipe.startX = e.touches[0].clientX;
    state.swipe.currentX = state.swipe.startX;
    state.swipe.isSwiping = true;
    
    state.swipe.currentCard = e.currentTarget;
    state.swipe.currentCard.classList.add('swiping');
    
    state.swipe.currentCard.style.transition = 'none';
    state.swipe.currentCard.style.transform = 'translateX(0)';
}

function handleTouchMove(e) {
    if (!state.swipe.isSwiping || !state.swipe.currentCard) return;

    state.swipe.currentX = e.touches[0].clientX;
    const diffX = state.swipe.currentX - state.swipe.startX;

    // Move card with finger movement
    state.swipe.currentCard.style.transform = `translateX(${diffX}px)`;

    // Add appropriate visual feedback
    if (diffX > 0) {
        state.swipe.currentCard.classList.add('swipe-left-active');
        state.swipe.currentCard.classList.remove('swipe-right-active');
    } else if (diffX < 0) {
        state.swipe.currentCard.classList.add('swipe-right-active');
        state.swipe.currentCard.classList.remove('swipe-left-active');
    } else {
        state.swipe.currentCard.classList.remove('swipe-left-active', 'swipe-right-active');
    }
}

function handleTouchEnd(_) {
    if (!state.swipe.isSwiping || !state.swipe.currentCard) return;

    const diffX = state.swipe.currentX - state.swipe.startX;
    const index = parseInt(state.swipe.currentCard.dataset.index);

    state.swipe.currentCard.style.transform = 'translateX(0)';
    state.swipe.currentCard.classList.remove('swiping', 'swipe-left-active', 'swipe-right-active');

    if (diffX > state.swipe.threshold) {
        openEditModal(index);
    } else if (diffX < -state.swipe.threshold) {
        openDeleteModal(index);
    }

    state.swipe.isSwiping = false;
    state.swipe.currentCard = null;
}

function resetAllCards() {
    const cards = document.querySelectorAll('.pizza-card');
    cards.forEach(card => {
        card.style.transition = 'none';
        card.style.transform = 'translateX(0)';
        card.classList.remove('swiping', 'swipe-left-active', 'swipe-right-active');
    });

    state.swipe.isSwiping = false;
    state.swipe.currentCard = null;
}


function initializeApp() {
    document.getElementById('addPizzaBtn').addEventListener('click', addPizza);
    document.getElementById('shareBtn').addEventListener('click', animateShareButton);
    document.getElementById('pizzaForm').addEventListener('submit', function(event) {
        event.preventDefault();
        addPizza();
    });
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeletePizza);

    window.addEventListener('click', function(event) {
        const editModal = document.getElementById('editModal');
        const infoModal = document.getElementById('infoModal');
        const deleteConfirmModal = document.getElementById('deleteConfirmModal');

        if (event.target === editModal) {
            closeModal('editModal');
        }
        
        if (event.target === infoModal) {
            closeModal('infoModal');
        }

        if (event.target === deleteConfirmModal) {
            closeModal('deleteConfirmModal');
        }
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('touchmove', e => {
            e.preventDefault();
        }, { passive: false });
    });

    const urlPizzas = decodePizzasFromUrl();
    if (urlPizzas && urlPizzas.length > 0) {
        state.pizzas = urlPizzas;
        calculateRanks();
        updateTable();
        updateCards();
    }

    updateSortIndicators();

    // Add keyboard event listeners for modals
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modals = ['editModal', 'infoModal', 'deleteConfirmModal'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal.style.display === 'flex') {
                    closeModal(modalId);
                }
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('load', updateSortIndicators);

window.addPizza = addPizza;
window.sortTable = sortTable;
window.openEditModal = openEditModal;
window.deletePizza = deletePizza;
window.savePizzaEdit = savePizzaEdit;
window.confirmDeletePizza = confirmDeletePizza;
window.closeModal = closeModal;
