
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const path = require("path");

const app = express();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sessionStore = new MySQLStore({}, db);

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 1000 * 60 * 60 * 4
    }
}));

function loginRequired(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({
            message: "Please login first"
        });
    }
    next();
}

function adminRequired(req, res, next) {
    if (!req.session.user ||
        req.session.user.role !== "admin") {
        return res.status(403).json({
            message: "Admin access only"
        });
    }
    next();
}

// CHECK LOGIN
app.get("/api/me", (req, res) => {
    res.json({ user: req.session.user || null });
});

// USER REGISTRATION
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password || password.length < 6) {
            return res.status(400).json({
                message: "Enter valid details. Password needs 6 characters."
            });
        }

        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email.toLowerCase()]
        );

        if (existing.length) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const [result] = await db.query(
            "INSERT INTO users(name,email,password,role) VALUES(?,?,?,'user')",
            [name, email.toLowerCase(), hashedPassword]
        );

        req.session.user = {
            id: result.insertId,
            name,
            email: email.toLowerCase(),
            role: "user"
        };

        res.json({ message: "Registration successful" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Registration failed" });
    }
});

// USER LOGIN
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [(email || "").toLowerCase()]
        );

        if (!users.length ||
            !(await bcrypt.compare(password || "", users[0].password))) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        req.session.regenerate(error => {
            if (error) {
                return res.status(500).json({
                    message: "Session error"
                });
            }

            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            };

            res.json({
                message: "Login successful",
                user: req.session.user
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Login failed" });
    }
});

// LOGOUT
app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Logged out" });
    });
});

// GET PRODUCTS
app.get("/api/products", async (req, res) => {
    try {
        const [products] = await db.query(
            "SELECT * FROM products ORDER BY id DESC"
        );
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Product loading failed" });
    }
});

// ADD PRODUCT - ADMIN ONLY
app.post("/api/products", adminRequired, async (req, res) => {
    try {
        const { name, category, price, image, description } = req.body;

        if (!name || !category || Number(price) <= 0) {
            return res.status(400).json({
                message: "Enter valid product details"
            });
        }

        await db.query(
            `INSERT INTO products
            (name,category,price,image,description)
            VALUES(?,?,?,?,?)`,
            [name, category, Number(price), image || "", description || ""]
        );

        res.json({ message: "Product added successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Product addition failed" });
    }
});

// DELETE PRODUCT - ADMIN ONLY
app.delete("/api/products/:id", adminRequired, async (req, res) => {
    try {
        await db.query(
            "DELETE FROM products WHERE id=?",
            [req.params.id]
        );

        res.json({ message: "Product deleted" });

    } catch (error) {
        res.status(400).json({
            message: "Cannot delete a product already used in an order"
        });
    }
});

// PLACE ORDER
app.post("/api/orders", loginRequired, async (req, res) => {
    const { items, address } = req.body;

    if (!Array.isArray(items) || !items.length || !address) {
        return res.status(400).json({
            message: "Add products and delivery address"
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        let total = 0;
        const checkedItems = [];

        for (const item of items) {
            const quantity = Number(item.quantity);

            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
                throw new Error("Invalid quantity");
            }

            const [products] = await connection.query(
                "SELECT * FROM products WHERE id=?",
                [Number(item.productId)]
            );

            if (!products.length) {
                throw new Error("Product not found");
            }

            const product = products[0];
            total += Number(product.price) * quantity;

            checkedItems.push({
                ...product,
                quantity
            });
        }

        const [order] = await connection.query(
            `INSERT INTO orders(user_id,total,address)
             VALUES(?,?,?)`,
            [req.session.user.id, total, address]
        );

        for (const item of checkedItems) {
            await connection.query(
                `INSERT INTO order_items
                 (order_id,product_id,quantity,price)
                 VALUES(?,?,?,?)`,
                [order.insertId, item.id, item.quantity, item.price]
            );
        }

        await connection.commit();

        res.json({
            message: "Order placed successfully",
            orderId: order.insertId,
            total
        });

    } catch (error) {
        await connection.rollback();
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
});

// VIEW ORDERS
app.get("/api/orders", loginRequired, async (req, res) => {
    try {
        let sql;
        let values = [];

        if (req.session.user.role === "admin") {
            sql = `SELECT orders.*, users.name AS customer_name
                   FROM orders JOIN users
                   ON orders.user_id=users.id
                   ORDER BY orders.id DESC`;
        } else {
            sql = "SELECT * FROM orders WHERE user_id=? ORDER BY id DESC";
            values = [req.session.user.id];
        }

        const [orders] = await db.query(sql, values);

        for (const order of orders) {
            const [items] = await db.query(
                "SELECT * FROM order_items WHERE order_id=?",
                [order.id]
            );
            order.items = items;
        }

        res.json(orders);

    } catch (error) {
        res.status(500).json({ message: "Order loading failed" });
    }
});

// UPDATE ORDER STATUS - ADMIN ONLY
app.patch("/api/orders/:id", adminRequired, async (req, res) => {
    const allowed = ["Placed", "Packed", "Shipped", "Delivered"];

    if (!allowed.includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid status" });
    }

    const [result] = await db.query(
        "UPDATE orders SET status=? WHERE id=?",
        [req.body.status, req.params.id]
    );

    if (!result.affectedRows) {
        return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order status updated" });
});

// START SERVER
app.listen(process.env.PORT || 3000, () => {
    console.log("E-Commerce server started!");
    console.log("Open http://localhost:3000");
});
