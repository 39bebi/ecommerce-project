# ShopEasy E-Commerce Website

A beginner-friendly demo online store using HTML, CSS, JavaScript, Node.js, Express and MySQL.

## Features
- Display products stored in MySQL
- Search products by name or category
- Add products to a shopping cart
- Increase/decrease cart quantities
- Checkout form
- Save orders and order items in MySQL
- Reduce product stock after a successful order

## Requirements
- Node.js (LTS)
- MySQL Server and MySQL Workbench (or another MySQL client)
- VS Code (recommended)

## Setup

1. Install Node.js and MySQL.
2. Open MySQL Workbench and connect to your local MySQL server.
3. Open `database.sql`, execute the full script, and confirm that `ecommerce_db` was created.
4. Open this project folder in VS Code.
5. Open the terminal in VS Code and run:

   ```bash
   npm install
   ```

6. Copy `.env.example` and rename the copy to `.env`.
7. Open `.env` and set your MySQL password:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_actual_mysql_password
   DB_NAME=ecommerce_db
   PORT=3000
   ```

   If your MySQL root account has no password, leave `DB_PASSWORD=` blank.

8. Start the application:

   ```bash
   npm start
   ```

9. Open your browser and visit `http://localhost:3000`.

## How to test
1. Check that the four sample products appear.
2. Click **Add to cart** on a product.
3. Open **Cart** and change the quantity if needed.
4. Enter a name, email and delivery address.
5. Click **Place order**.
6. In MySQL Workbench, run:

   ```sql
   USE ecommerce_db;
   SELECT * FROM orders;
   SELECT * FROM order_items;
   SELECT * FROM products;
   ```

   You should see the saved order and updated product stock.

## Common errors
- **Access denied for user root:** Check `DB_USER` and `DB_PASSWORD` in `.env`.
- **Unknown database ecommerce_db:** Run `database.sql` in MySQL Workbench.
- **ECONNREFUSED:** Start the MySQL service and try again.
- **npm is not recognized:** Install Node.js, close and reopen VS Code, then run `node -v` and `npm -v`.

## Important
This is a learning/demo project, not a production store. It does not include user accounts, online payments, tax/shipping calculations, or production-grade security. Do not enter real payment-card details. Keep `.env` private and never upload it to GitHub.
