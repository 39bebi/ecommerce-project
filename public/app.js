
let products = [];
let cart = [];
let currentUser = null;
let registerMode = false;

const $ = id => document.getElementById(id);

function money(value) {
    return "₹" + Number(value).toLocaleString("en-IN");
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

// PAGE NAVIGATION
function showPage(page) {
    document.querySelectorAll(".page").forEach(section => {
        section.classList.add("hidden");
    });

    $(page).classList.remove("hidden");

    if (page === "cart") displayCart();
    if (page === "orders") loadOrders();
    if (page === "admin") loadAdmin();
}

// LOGIN / REGISTER SWITCH
function changeMode() {
    registerMode = !registerMode;

    $("name").classList.toggle("hidden", !registerMode);
    $("name").required = registerMode;

    $("authButton").textContent =
        registerMode ? "Register" : "Login";

    $("authMessage").textContent = "";
}

// LOAD USER
async function loadUser() {
    const data = await api("/api/me");

    currentUser = data.user;

    if (currentUser) {
        $("account").innerHTML = `
            <span>Welcome ${currentUser.name}</span>
            <button onclick="logout()">Logout</button>
        `;

        $("adminButton").classList.toggle(
            "hidden",
            currentUser.role !== "admin"
        );
    } else {
        $("account").innerHTML = `
            <button onclick="showPage('auth')">
                Login / Register
            </button>
        `;

        $("adminButton").classList.add("hidden");
    }
}

// REGISTER AND LOGIN
$("authForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const body = {
        email: $("email").value,
        password: $("password").value
    };

    if (registerMode) {
        body.name = $("name").value;
    }

    try {
        const url = registerMode
            ? "/api/register"
            : "/api/login";

        await api(url, {
            method: "POST",
            body: JSON.stringify(body)
        });

        await loadUser();

        $("authMessage").textContent =
            "Login successful!";

        showPage("home");

    } catch (error) {
        $("authMessage").textContent = error.message;
    }
});

// LOGOUT
async function logout() {
    await api("/api/logout", {
        method: "POST"
    });

    currentUser = null;
    cart = [];

    updateCartCount();
    await loadUser();
    showPage("home");
}

// LOAD PRODUCTS
async function loadProducts() {
    products = await api("/api/products");
    displayProducts();
}

// DISPLAY PRODUCTS
function displayProducts() {
    const category = $("category").value;

    const filtered = products.filter(product =>
        category === "All" ||
        product.category === category
    );

    $("products").innerHTML = filtered.map(product => `
        <div class="product">

            <img src="${product.image}"
                 alt="${product.name}"
                 onerror="this.src='https://placehold.co/400x300?text=Product'">

            <h3>${product.name}</h3>

            <p>${product.description || ""}</p>

            <p class="price">
                ${money(product.price)}
            </p>

            <button onclick="addToCart(${product.id})">
                Add To Cart
            </button>

        </div>
    `).join("") || "<p>No products found.</p>";
}

// ADD TO CART
function addToCart(id) {
    const item = cart.find(p => p.productId === id);

    if (item) {
        item.quantity++;
    } else {
        cart.push({
            productId: id,
            quantity: 1
        });
    }

    updateCartCount();
    alert("Product added to cart!");
}

// CART COUNT
function updateCartCount() {
    $("cartCount").textContent =
        cart.reduce((total, item) =>
            total + item.quantity, 0);
}

// DISPLAY CART
function displayCart() {
    let total = 0;

    $("cartItems").innerHTML = cart.map(item => {
        const product = products.find(
            p => p.id === item.productId
        );

        if (!product) return "";

        const amount = Number(product.price) * item.quantity;

        total += amount;

        return `
            <div class="cart-item">

                <span>
                    ${product.name}
                </span>

                <input type="number"
                    min="1"
                    max="99"
                    value="${item.quantity}"
                    onchange="changeQuantity(
                        ${product.id}, this.value
                    )">

                <b>${money(amount)}</b>

                <button class="danger"
                    onclick="removeItem(${product.id})">
                    Remove
                </button>

            </div>
        `;
    }).join("") || "<p>Your cart is empty.</p>";

    $("total").textContent = "Total: " + money(total);
}

// CHANGE QUANTITY
function changeQuantity(id, quantity) {
    const item = cart.find(p => p.productId === id);

    if (item) {
        item.quantity = Math.max(
            1,
            Math.min(99, Number(quantity) || 1)
        );
    }

    updateCartCount();
    displayCart();
}

// REMOVE ITEM
function removeItem(id) {
    cart = cart.filter(p => p.productId !== id);

    updateCartCount();
    displayCart();
}

// CHECKOUT
async function checkout() {
    if (!currentUser) {
        alert("Please login before checkout.");
        showPage("auth");
        return;
    }

    if (cart.length === 0) {
        $("checkoutMessage").textContent =
            "Your cart is empty.";
        return;
    }

    const address = $("address").value.trim();

    if (!address) {
        $("checkoutMessage").textContent =
            "Enter your delivery address.";
        return;
    }

    try {
        const result = await api("/api/orders", {
            method: "POST",

            body: JSON.stringify({
                address,
                items: cart
            })
        });

        $("checkoutMessage").textContent =
            "Order placed successfully! Order ID: " +
            result.orderId;

        cart = [];

        updateCartCount();
        displayCart();

    } catch (error) {
        $("checkoutMessage").textContent = error.message;
    }
}

// ADMIN - ADD PRODUCT
$("productForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    try {
        await api("/api/products", {
            method: "POST",

            body: JSON.stringify({
                name: $("pname").value,
                category: $("pcategory").value,
                price: $("pprice").value,
                image: $("pimage").value,
                description: $("pdescription").value
            })
        });

        $("productMessage").textContent =
            "Product added successfully!";

        $("productForm").reset();

        await loadProducts();
        await loadAdmin();

    } catch (error) {
        $("productMessage").textContent = error.message;
    }
});

// ADMIN - LOAD PRODUCTS AND ORDERS
async function loadAdmin() {
    if (!currentUser || currentUser.role !== "admin") {
        return;
    }

    try {
        await loadProducts();

        $("adminProducts").innerHTML = products.map(p => `
            <div class="admin-item">
                <span>${p.name} - ${money(p.price)}</span>

                <button class="danger"
                    onclick="deleteProduct(${p.id})">
                    Delete
                </button>
            </div>
        `).join("");

        const orders = await api("/api/orders");

        $("adminOrders").innerHTML = orders.map(o => `
            <div class="order-item">

                <div>
                    <b>Order #${o.id}</b>
                    <p>Customer: ${o.customer_name}</p>
                    <p>Total: ${money(o.total)}</p>
                    <p>Status: ${o.status}</p>
                </div>

                <select onchange="updateStatus(
                    ${o.id}, this.value
                )">
                    ${["Placed", "Packed", "Shipped", "Delivered"]
                        .map(status => `
                            <option ${o.status === status ? "selected" : ""}>
                                ${status}
                            </option>
                        `).join("")}
                </select>

            </div>
        `).join("") || "<p>No orders yet.</p>";

    } catch (error) {
        $("adminOrders").textContent = error.message;
    }
}

// DELETE PRODUCT
async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) {
        return;
    }

    try {
        await api("/api/products/" + id, {
            method: "DELETE"
        });

        await loadProducts();
        await loadAdmin();

    } catch (error) {
        alert(error.message);
    }
}

// ORDER TRACKING
async function loadOrders() {
    if (!currentUser) {
        $("orderList").textContent =
            "Please login to view your orders.";
        return;
    }

    try {
        const orders = await api("/api/orders");

        $("orderList").innerHTML = orders.map(order => `
            <div class="order-item">

                <div>
                    <h3>Order #${order.id}</h3>

                    <p>Address: ${order.address}</p>

                    <p>
                        ${order.items.map(item =>
                            item.product_id + " × " + item.quantity
                        ).join(", ")}
                    </p>

                    <p>Total: ${money(order.total)}</p>

                    <b>Status: ${order.status}</b>
                </div>

            </div>
        `).join("") || "<p>No orders found.</p>";

    } catch (error) {
        $("orderList").textContent = error.message;
    }
}

// ADMIN - UPDATE ORDER STATUS
async function updateStatus(id, status) {
    try {
        await api("/api/orders/" + id, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });

        await loadAdmin();

    } catch (error) {
        alert(error.message);
    }
}

// INITIALIZE WEBSITE
async function startApp() {
    try {
        await loadUser();
        await loadProducts();
    } catch (error) {
        $("products").textContent =
            "Server or database connection failed. Check your settings.";
        console.error(error);
    }
}

startApp();
