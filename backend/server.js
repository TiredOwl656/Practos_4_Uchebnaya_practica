require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT,
});

// === АДМИН МИДЛВАР ===
const adminMiddleware = async (req, res, next) => {
  const email = req.headers['user-email'] || req.query.userEmail || (req.body && req.body.userEmail);

  if (!email) {
    return res.status(401).json({ error: 'Авторизуйтесь (email не передан)' });
  }

  try {
    const resUser = await pool.query('SELECT role_id FROM users WHERE email = $1', [email]);
    if (!resUser.rows[0] || resUser.rows[0].role_id !== 2) {
      return res.status(403).json({ error: 'Только админ' });
    }
    req.userEmail = email;
    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ error: err.message });
  }
};

// === РЕГИСТРАЦИЯ ===

/**
 * Регистрация нового пользователя
 * POST /api/auth/register
 * 
 * @param {Object} req - Объект запроса
 * @param {string} req.body.full_name - Полное имя пользователя
 * @param {string} req.body.email - Email пользователя
 * @param {string} req.body.password - Пароль пользователя
 * @param {string} [req.body.phone] - Телефон пользователя
 * @param {string} [req.body.default_address] - Адрес по умолчанию
 * @param {Object} res - Объект ответа
 */

app.post('/api/auth/register', async (req, res) => {
  const { full_name, email, password, phone, default_address } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Имя, email и пароль обязательны' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }

  try {
    const existingUser = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password, phone, default_address, role_id) 
       VALUES ($1, $2, $3, $4, $5, 1) 
       RETURNING user_id, email, full_name, phone, default_address, role_id`,
      [full_name, email, password, phone || null, default_address || null]
    );

    const user = newUser.rows[0];

    // Создаем корзину для пользователя (только для обычных пользователей)
    await pool.query('INSERT INTO carts (user_id) VALUES ($1)', [user.user_id]);

    res.json({
      user: {
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        default_address: user.default_address,
        role_id: user.role_id
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// === ЛОГИН ===

/**
 * Аутентификация пользователя
 * POST /api/auth/login
 * 
 * @param {Object} req - Объект запроса
 * @param {string} req.body.email - Email пользователя
 * @param {string} req.body.password - Пароль пользователя
 * @param {Object} res - Объект ответа
 */

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Заполните поля' });

  try {
    const userRes = await pool.query(`
      SELECT u.*, r.role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.role_id 
      WHERE u.email = $1
    `, [email]);
    
    const user = userRes.rows[0];
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    res.json({
      user: {
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        default_address: user.default_address,
        role_id: user.role_id,
        role_name: user.role_name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// === ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ ===
app.get('/api/auth/me', async (req, res) => {
  const email = req.headers['user-email'];
  if (!email) return res.status(401).json({ error: 'Не авторизован' });

  try {
    const userRes = await pool.query(`
      SELECT u.user_id, u.email, u.full_name, u.phone, u.default_address, u.role_id, r.role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.role_id 
      WHERE u.email = $1
    `, [email]);
    
    if (!userRes.rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(userRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === УСЛУГИ ===

/**
 * Получение списка услуг с возможностью фильтрации по категории
 * GET /api/services
 * 
 * @param {Object} req - Объект запроса
 * @param {number} [req.query.category_id] - ID категории для фильтрации
 * @param {Object} res - Объект ответа
 */

app.get('/api/services', async (req, res) => {
  const { category_id } = req.query;
  try {
    let query = `
      SELECT s.*, c.category_name 
      FROM services s 
      LEFT JOIN categories c ON s.category_id = c.category_id
    `;
    const params = [];
    if (category_id) {
      query += ' WHERE s.category_id = $1';
      params.push(category_id);
    }
    query += ' ORDER BY s.service_id';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Services GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT s.*, c.category_name 
      FROM services s 
      LEFT JOIN categories c ON s.category_id = c.category_id
      WHERE s.service_id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Услуга не найдена' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Service GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ОТЗЫВЫ ===
app.get('/api/services/:id/reviews', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT r.*, u.full_name 
      FROM reviews r 
      LEFT JOIN users u ON r.user_id = u.user_id 
      WHERE r.service_id = $1 
      ORDER BY r.created_at DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Reviews GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const { user_id, rating, comment } = req.body;
  
  if (!user_id || !rating) {
    return res.status(400).json({ error: 'Рейтинг обязателен' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO reviews (service_id, user_id, rating, comment) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, [id, user_id, rating, comment || null]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Review POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ВСЕ ОТЗЫВЫ (для админа) ===
app.get('/api/reviews/all', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.full_name, s.name as service_name
      FROM reviews r 
      LEFT JOIN users u ON r.user_id = u.user_id 
      LEFT JOIN services s ON r.service_id = s.service_id 
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('All reviews GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === УДАЛЕНИЕ ОТЗЫВА (админ) ===
app.delete('/api/reviews/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM reviews WHERE review_id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Review DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ОТЗЫВЫ ПОЛЬЗОВАТЕЛЯ ===
app.get('/api/users/:userId/reviews', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT r.*, s.name as service_name, s.service_id
      FROM reviews r 
      LEFT JOIN services s ON r.service_id = s.service_id 
      WHERE r.user_id = $1 
      ORDER BY r.created_at DESC
    `, [userId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('User reviews GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === КОРЗИНА ===
app.get('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const cartRes = await pool.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
    if (cartRes.rows.length === 0) {
      return res.json({ items: [] });
    }

    const items = await pool.query(`
      SELECT ci.cart_item_id, ci.service_id, ci.quantity, 
             s.name, s.price, s.duration, s.image_url
      FROM cart_items ci
      JOIN services s ON ci.service_id = s.service_id
      WHERE ci.cart_id = $1
    `, [cartRes.rows[0].cart_id]);

    res.json({ items: items.rows });
  } catch (err) {
    console.error('Cart GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Добавление услуги в корзину пользователя
 * POST /api/cart/add
 * 
 * @param {Object} req - Объект запроса
 * @param {number} req.body.userId - ID пользователя
 * @param {number} req.body.service_id - ID услуги
 * @param {number} [req.body.quantity=1] - Количество
 * @param {Object} res - Объект ответа
 */

app.post('/api/cart/add', async (req, res) => {
  const { userId, service_id, quantity = 1 } = req.body;

  console.log('Cart add request:', { userId, service_id, quantity });

  if (!userId || !service_id) {
    return res.status(400).json({ error: 'userId и service_id обязательны' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Проверяем, не админ ли пользователь
    const userCheck = await client.query('SELECT role_id FROM users WHERE user_id = $1', [userId]);
    if (userCheck.rows[0]?.role_id === 2) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Администраторы не могут добавлять товары в корзину' });
    }

    // Проверяем существование услуги
    const serviceCheck = await client.query(
      'SELECT service_id FROM services WHERE service_id = $1',
      [service_id]
    );
    
    if (serviceCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Услуга не найдена' });
    }

    // Находим или создаем корзину
    let cartRes = await client.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
    let cart_id;

    if (cartRes.rows.length === 0) {
      const newCart = await client.query(
        'INSERT INTO carts (user_id) VALUES ($1) RETURNING cart_id', 
        [userId]
      );
      cart_id = newCart.rows[0].cart_id;
    } else {
      cart_id = cartRes.rows[0].cart_id;
    }

    // Проверяем, есть ли уже такой товар в корзине
    const existingItem = await client.query(
      'SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = $1 AND service_id = $2',
      [cart_id, service_id]
    );

    if (existingItem.rows.length > 0) {
      // Обновляем количество если товар уже есть
      await client.query(
        'UPDATE cart_items SET quantity = quantity + $1 WHERE cart_item_id = $2',
        [quantity, existingItem.rows[0].cart_item_id]
      );
    } else {
      // Добавляем новый товар
      await client.query(
        'INSERT INTO cart_items (cart_id, service_id, quantity) VALUES ($1, $2, $3)',
        [cart_id, service_id, quantity]
      );
    }

    await client.query('COMMIT');

    res.json({ 
      success: true,
      message: 'Услуга добавлена в корзину'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cart ADD ERROR:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/cart/remove', async (req, res) => {
  const { userId, service_id } = req.body;
  
  console.log('Remove from cart request:', { userId, service_id });
  
  if (!userId || !service_id) {
    return res.status(400).json({ error: 'userId и service_id обязательны' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const cartRes = await client.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
    
    if (cartRes.rows.length > 0) {
      await client.query(
        'DELETE FROM cart_items WHERE cart_id = $1 AND service_id = $2',
        [cartRes.rows[0].cart_id, service_id]
      );
    }

    await client.query('COMMIT');
    
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cart REMOVE error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/cart/clear', async (req, res) => {
  const { userId } = req.body;
  
  console.log('Clear cart request:', { userId });
  
  if (!userId) {
    return res.status(400).json({ error: 'userId обязателен' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const cartRes = await client.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
    
    if (cartRes.rows.length > 0) {
      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartRes.rows[0].cart_id]);
    }

    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Корзина очищена' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cart CLEAR error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// === ЗАКАЗЫ ===

/**
 * Создание нового заказа
 * POST /api/orders/create
 * 
 * @param {Object} req - Объект запроса
 * @param {number} req.body.userId - ID пользователя
 * @param {Array} req.body.items - Массив товаров в заказе
 * @param {string} req.body.delivery_address - Адрес доставки
 * @param {string} req.body.delivery_date - Дата доставки
 * @param {Object} res - Объект ответа
 */

app.post('/api/orders/create', async (req, res) => {
  const { userId, items, delivery_address, delivery_date } = req.body;

  console.log('Create order request:', { userId, items, delivery_address, delivery_date });

  if (!userId || !items || items.length === 0 || !delivery_address || !delivery_date) {
    return res.status(400).json({ error: 'Заполните все поля заказа' });
  }

  // Проверяем, не админ ли пользователь
  const userCheck = await pool.query('SELECT role_id FROM users WHERE user_id = $1', [userId]);
  if (userCheck.rows[0]?.role_id === 2) {
    return res.status(403).json({ error: 'Администраторы не могут оформлять заказы' });
  }

  // Валидация даты доставки
  const deliveryDate = new Date(delivery_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (deliveryDate < today) {
    return res.status(400).json({ error: 'Дата доставки не может быть меньше текущей' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const orderRes = await client.query(`
      INSERT INTO orders (user_id, delivery_address, delivery_date, total_amount, status) 
      VALUES ($1, $2, $3, $4, 'новый') RETURNING order_id
    `, [userId, delivery_address, delivery_date, totalAmount]);
    
    const orderId = orderRes.rows[0].order_id;

    // Сохраняем элементы заказа
    for (const item of items) {
      await client.query(`
        INSERT INTO order_items (order_id, service_id, quantity, price_at_purchase) 
        VALUES ($1, $2, $3, $4)
      `, [orderId, item.service_id, item.quantity, item.price]);
    }

    // Очищаем корзину
    const cartRes = await client.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
    if (cartRes.rows.length > 0) {
      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartRes.rows[0].cart_id]);
    }

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      order_id: orderId,
      total_amount: totalAmount 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  } finally {
    client.release();
  }
});

app.get('/api/orders/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const ordersRes = await pool.query(`
      SELECT 
        o.order_id,
        o.user_id,
        o.delivery_address,
        o.delivery_date,
        o.total_amount,
        o.status,
        o.order_date,
        json_agg(
          json_build_object(
            'service_name', s.name,
            'service_id', s.service_id,
            'quantity', oi.quantity,
            'price', oi.price_at_purchase
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN services s ON oi.service_id = s.service_id
      WHERE o.user_id = $1
      GROUP BY o.order_id
      ORDER BY o.order_date DESC
    `, [userId]);

    res.json(ordersRes.rows);
  } catch (err) {
    console.error('Orders history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ЛИЧНЫЙ КАБИНЕТ - обновление данных ===
app.put('/api/users/profile', async (req, res) => {
  const { userId, full_name, email, phone, default_address } = req.body;

  console.log('Profile update request:', { userId, full_name, email });

  if (!userId) {
    return res.status(400).json({ error: 'userId обязателен' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Проверяем, не занят ли email другим пользователем
    if (email) {
      const emailCheck = await client.query(
        'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
        [email, userId]
      );
      
      if (emailCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Email уже используется другим пользователем' });
      }
    }

    const result = await client.query(`
      UPDATE users 
      SET full_name = $1, email = $2, phone = $3, default_address = $4 
      WHERE user_id = $5 
      RETURNING user_id, full_name, email, phone, default_address, role_id
    `, [full_name, email, phone, default_address, userId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await client.query('COMMIT');

    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Profile update error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// === КАТЕГОРИИ ===
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT category_id, category_name FROM categories ORDER BY category_id');
    res.json(result.rows);
  } catch (err) {
    console.error('Categories GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', adminMiddleware, async (req, res) => {
  const { category_name } = req.body;
  if (!category_name) return res.status(400).json({ error: 'Название обязательно' });

  try {
    const result = await pool.query(
      'INSERT INTO categories (category_name) VALUES ($1) RETURNING category_id, category_name',
      [category_name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Category POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { category_name } = req.body;
  if (!category_name) return res.status(400).json({ error: 'Название обязательно' });

  try {
    const result = await pool.query(
      'UPDATE categories SET category_name = $1 WHERE category_id = $2 RETURNING category_id, category_name',
      [category_name, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Категория не найдена' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Category PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM categories WHERE category_id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Category DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === АДМИН ФУНКЦИИ ===
app.get('/api/users', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.user_id, u.full_name, u.email, u.phone, u.default_address, r.role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.role_id 
      ORDER BY u.user_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Управление услугами (админ)
app.post('/api/services', adminMiddleware, async (req, res) => {
  const { name, description, price, duration, category_id, image_url } = req.body;
  
  if (!name || !price || !category_id) {
    return res.status(400).json({ error: 'Название, цена и категория обязательны' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO services (name, description, price, duration, category_id, image_url) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [name, description || null, price, duration || null, category_id, image_url || null]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Service POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/services/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, duration, category_id, image_url } = req.body;

  try {
    const result = await pool.query(`
      UPDATE services SET 
        name = $1, description = $2, price = $3, duration = $4,
        category_id = $5, image_url = $6
      WHERE service_id = $7 RETURNING *
    `, [name, description || null, price, duration || null, category_id, image_url || null, id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Услуга не найдена' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Service PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/services/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM services WHERE service_id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Service DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ (админ) ===
app.delete('/api/users/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE user_id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('User DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ЗАПУСК СЕРВЕРА ===
app.listen(PORT, () => {
  console.log(`API запущен на http://localhost:${PORT}`);
});