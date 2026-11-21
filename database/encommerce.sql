
CREATE DATABASE ecommerce;

USE ecommerce;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('admin','user') DEFAULT 'user'
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    category VARCHAR(50),
    price DECIMAL(10,2),
    image VARCHAR(500),
    description TEXT
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    total DECIMAL(10,2),
    address TEXT,
    status VARCHAR(30) DEFAULT 'Placed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT,
    price DECIMAL(10,2),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT INTO products (name, category, price, image, description) VALUES
('Fresh Tomatoes', 'Vegetables', 45,
'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600',
'Fresh red tomatoes'),

('Fresh Carrots', 'Vegetables', 60,
'https://images.unsplash.com/photo-1445282768818-728615cc910a?w=600',
'Fresh crunchy carrots'),

('Broccoli', 'Vegetables', 85,
'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=600',
'Fresh green broccoli'),

('Red Apples', 'Fruits', 160,
'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600',
'Fresh red apples'),

('Bananas', 'Fruits', 55,
'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600',
'Fresh bananas'),

('Oranges', 'Fruits', 90,
'https://images.unsplash.com/photo-1547514701-42782101795e?w=600',
'Juicy oranges'),

('Women Dress', 'Women Fashion', 899,
'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600',
'Beautiful floral dress'),

('Women Top', 'Women Fashion', 499,
'https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=600',
'Casual women top'),

('Men Shirt', 'Men Fashion', 799,
'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600',
'Stylish men shirt'),

('Men Jacket', 'Men Fashion', 1499,
'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600',
'Casual men jacket');
