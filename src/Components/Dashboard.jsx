import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';
import './Dashboard.css';

const API = 'http://localhost:3001/api';

const Dashboard = () => {
  const { user, logout } = useCart();
  const navigate = useNavigate();
  const isAdmin = user?.role_id === 2;

  const [tab, setTab] = useState(isAdmin ? 'services' : 'profile');
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    default_address: ''
  });
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    category_id: '',
    image_url: ''
  });
  const [categoryForm, setCategoryForm] = useState({ category_name: '' });
  const [editingService, setEditingService] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [errors, setErrors] = useState({});

  // === РЕДИРЕКТ ПРИ ВЫХОДЕ ===
  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  // === ЗАГРУЗКА ДАННЫХ ===
  useEffect(() => {
    if (user) {
      if (isAdmin) {
        loadAdminData();
      } else {
        loadUserData();
      }
    }
  }, [user, isAdmin]);

  const loadUserData = async () => {
    try {
      const ordersRes = await axios.get(`${API}/orders/${user.id}`);
      setOrders(ordersRes.data);
      
      const reviewsRes = await axios.get(`${API}/users/${user.id}/reviews`);
      setReviews(reviewsRes.data);
      
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        default_address: user.default_address || ''
      });
    } catch (err) {
      toast.error('Ошибка загрузки данных');
    }
  };

  const loadAdminData = async () => {
    try {
      const config = { headers: { 'user-email': user.email } };
      const [sRes, uRes, cRes, revRes] = await Promise.all([
        axios.get(`${API}/services`),
        axios.get(`${API}/users`, config),
        axios.get(`${API}/categories`),
        axios.get(`${API}/reviews/all`, config) // Нужно добавить этот эндпоинт
      ]);
      setServices(sRes.data);
      setUsers(uRes.data);
      setCategories(cRes.data);
      setReviews(revRes.data || []);
    } catch (err) {
      console.error('Admin data load error:', err);
      toast.error('Ошибка загрузки админ-данных');
    }
  };

  // === УПРАВЛЕНИЕ УСЛУГАМИ (АДМИН) ===
  const handleServiceSubmit = async () => {
    if (!serviceForm.name || !serviceForm.price || !serviceForm.category_id) {
      toast.error('Заполните обязательные поля');
      return;
    }

    try {
      const config = { headers: { 'user-email': user.email } };
      const data = {
        ...serviceForm,
        price: parseFloat(serviceForm.price),
        duration: serviceForm.duration || 'Не указано'
      };

      if (editingService) {
        await axios.put(`${API}/services/${editingService}`, data, config);
        toast.success('Услуга обновлена');
      } else {
        await axios.post(`${API}/services`, data, config);
        toast.success('Услуга добавлена');
      }

      setServiceForm({
        name: '', description: '', price: '', duration: '', category_id: '', image_url: ''
      });
      setEditingService(null);
      loadAdminData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const deleteService = async (id) => {
    if (!window.confirm('Удалить услугу?')) return;
    try {
      await axios.delete(`${API}/services/${id}`, { headers: { 'user-email': user.email } });
      toast.success('Услуга удалена');
      loadAdminData();
    } catch (err) {
      toast.error('Ошибка удаления');
    }
  };

  // === УПРАВЛЕНИЕ КАТЕГОРИЯМИ (АДМИН) ===
  const handleCategorySubmit = async () => {
    if (!categoryForm.category_name) {
      toast.error('Введите название категории');
      return;
    }

    try {
      const config = { headers: { 'user-email': user.email } };
      if (editingCategory) {
        await axios.put(`${API}/categories/${editingCategory}`, categoryForm, config);
        toast.success('Категория обновлена');
      } else {
        await axios.post(`${API}/categories`, categoryForm, config);
        toast.success('Категория добавлена');
      }

      setCategoryForm({ category_name: '' });
      setEditingCategory(null);
      loadAdminData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Удалить категорию?')) return;
    try {
      await axios.delete(`${API}/categories/${id}`, { headers: { 'user-email': user.email } });
      toast.success('Категория удалена');
      loadAdminData();
    } catch (err) {
      toast.error('Ошибка удаления');
    }
  };

  // === УПРАВЛЕНИЕ ОТЗЫВАМИ (АДМИН) ===
  const deleteReview = async (id) => {
    if (!window.confirm('Удалить отзыв?')) return;
    try {
      await axios.delete(`${API}/reviews/${id}`, { headers: { 'user-email': user.email } });
      toast.success('Отзыв удален');
      loadAdminData();
    } catch (err) {
      toast.error('Ошибка удаления отзыва');
    }
  };

  // === ОБНОВЛЕНИЕ ПРОФИЛЯ (ТОЛЬКО ДЛЯ ПОЛЬЗОВАТЕЛЕЙ) ===
  const handleProfileUpdate = async () => {
    if (!profileForm.full_name || !profileForm.email) {
      toast.error('Заполните обязательные поля');
      return;
    }

    try {
      const res = await axios.put(`${API}/users/profile`, {
        userId: user.id,
        ...profileForm
      });
      
      toast.success('Профиль обновлен');
      localStorage.setItem('user', JSON.stringify({ ...user, ...res.data }));
      window.location.reload();
    } catch (err) {
      toast.error('Ошибка обновления профиля');
    }
  };

  // === ДЛЯ АДМИНОВ - ПАНЕЛЬ УПРАВЛЕНИЯ ===
  if (isAdmin) {
    return (
      <div className="dashboard">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <div className="user-info">
              <h2>Панель управления (Админ)</h2>
              <p>{user?.email}</p>
            </div>
            <button className="back-btn" onClick={logout}>Выйти</button>
          </div>

          <div className="tabs">
            <button className={tab === 'services' ? 'active' : ''} onClick={() => setTab('services')}>
              Услуги
            </button>
            <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>
              Категории
            </button>
            <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
              Пользователи
            </button>
            <button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>
              Отзывы
            </button>
          </div>

          {/* УПРАВЛЕНИЕ УСЛУГАМИ */}
          {tab === 'services' && (
            <div className="admin-section">
              <h3>{editingService ? 'Редактировать услугу' : 'Добавить услугу'}</h3>
              <div className="form-grid">
                <input 
                  placeholder="Название услуги *" 
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                />
                <input 
                  placeholder="Цена *" 
                  type="number"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({...serviceForm, price: e.target.value})}
                />
                <input 
                  placeholder="Длительность" 
                  value={serviceForm.duration}
                  onChange={(e) => setServiceForm({...serviceForm, duration: e.target.value})}
                />
                <select 
                  value={serviceForm.category_id}
                  onChange={(e) => setServiceForm({...serviceForm, category_id: e.target.value})}
                >
                  <option value="">Выберите категорию *</option>
                  {categories.map(c => (
                    <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                  ))}
                </select>
                <input 
                  placeholder="URL изображения" 
                  value={serviceForm.image_url}
                  onChange={(e) => setServiceForm({...serviceForm, image_url: e.target.value})}
                />
                <textarea 
                  placeholder="Описание услуги"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button className="btn-primary" onClick={handleServiceSubmit}>
                  {editingService ? 'Обновить' : 'Добавить'}
                </button>
                {editingService && (
                  <button className="btn-secondary" onClick={() => {
                    setServiceForm({name: '', description: '', price: '', duration: '', category_id: '', image_url: ''});
                    setEditingService(null);
                  }}>
                    Отмена
                  </button>
                )}
              </div>

              <div className="admin-list">
                <h4>Все услуги ({services.length})</h4>
                {services.map(service => (
                  <div key={service.service_id} className="admin-item">
                    <div>
                      <strong>{service.name}</strong>
                      <p>{service.price} ₽ • {service.duration} • {service.category_name}</p>
                    </div>
                    <div className="item-actions">
                      <button onClick={() => {
                        setServiceForm({
                          name: service.name,
                          description: service.description || '',
                          price: service.price,
                          duration: service.duration,
                          category_id: service.category_id,
                          image_url: service.image_url || ''
                        });
                        setEditingService(service.service_id);
                      }}>
                        Изменить
                      </button>
                      <button className="btn-danger" onClick={() => deleteService(service.service_id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* УПРАВЛЕНИЕ КАТЕГОРИЯМИ */}
          {tab === 'categories' && (
            <div className="admin-section">
              <h3>{editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}</h3>
              <div className="form-grid">
                <input 
                  placeholder="Название категории *" 
                  value={categoryForm.category_name}
                  onChange={(e) => setCategoryForm({ category_name: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button className="btn-primary" onClick={handleCategorySubmit}>
                  {editingCategory ? 'Обновить' : 'Добавить'}
                </button>
                {editingCategory && (
                  <button className="btn-secondary" onClick={() => {
                    setCategoryForm({ category_name: '' });
                    setEditingCategory(null);
                  }}>
                    Отмена
                  </button>
                )}
              </div>

              <div className="admin-list">
                <h4>Все категории ({categories.length})</h4>
                {categories.map(category => (
                  <div key={category.category_id} className="admin-item">
                    <div>
                      <strong>{category.category_name}</strong>
                    </div>
                    <div className="item-actions">
                      <button onClick={() => {
                        setCategoryForm({ category_name: category.category_name });
                        setEditingCategory(category.category_id);
                      }}>
                        Изменить
                      </button>
                      <button className="btn-danger" onClick={() => deleteCategory(category.category_id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ */}
          {tab === 'users' && (
            <div className="admin-section">
              <h3>Управление пользователями</h3>
              <div className="admin-list">
                <h4>Все пользователи ({users.length})</h4>
                {users.map(userItem => (
                  <div key={userItem.user_id} className="admin-item">
                    <div>
                      <strong>{userItem.full_name}</strong>
                      <p>{userItem.email} • {userItem.phone || 'Телефон не указан'}</p>
                      <p>Роль: {userItem.role_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* УПРАВЛЕНИЕ ОТЗЫВАМИ */}
          {tab === 'reviews' && (
            <div className="admin-section">
              <h3>Управление отзывами</h3>
              <div className="admin-list">
                <h4>Все отзывы ({reviews.length})</h4>
                {reviews.map(review => (
                  <div key={review.review_id} className="admin-item">
                    <div>
                      <strong>Услуга: {review.service_name}</strong>
                      <p>Пользователь: {review.full_name || 'Аноним'}</p>
                      <p>Рейтинг: {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                      {review.comment && <p>Комментарий: {review.comment}</p>}
                      <p>Дата: {new Date(review.created_at).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <div className="item-actions">
                      <button className="btn-danger" onClick={() => deleteReview(review.review_id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // === ДЛЯ ОБЫЧНЫХ ПОЛЬЗОВАТЕЛЕЙ - СТАРЫЙ ФУНКЦИОНАЛ ===
  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="user-info">
            <h2>Личный кабинет</h2>
            <p>{user?.email || 'Загрузка...'}</p>
          </div>
          <button className="back-btn" onClick={logout}>Выйти</button>
        </div>

        <div className="tabs">
          <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
            Профиль
          </button>
          <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>
            Мои заказы
          </button>
          <button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>
            Мои отзывы
          </button>
        </div>

        {/* ПРОФИЛЬ */}
        {tab === 'profile' && (
          <div className="profile-section">
            <div className="profile-card">
              <h3>Редактирование профиля</h3>
              <div className="form-grid">
                <div>
                  <label>Полное имя *</label>
                  <input
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                    placeholder="Иван Иванов"
                  />
                </div>
                <div>
                  <label>Email *</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                    placeholder="ivan@example.com"
                  />
                </div>
                <div>
                  <label>Телефон</label>
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                    placeholder="+79991234567"
                  />
                </div>
                <div>
                  <label>Адрес по умолчанию</label>
                  <input
                    value={profileForm.default_address}
                    onChange={(e) => setProfileForm({...profileForm, default_address: e.target.value})}
                    placeholder="г. Москва, ул. Примерная, д. 1"
                  />
                </div>
              </div>
              <button className="btn-primary" onClick={handleProfileUpdate}>
                Сохранить изменения
              </button>
            </div>
          </div>
        )}

        {/* ЗАКАЗЫ */}
        {tab === 'orders' && (
          <div className="orders-section">
            {orders.length === 0 ? (
              <div className="empty-orders">
                <p>У вас пока нет заказов</p>
                <Link to="/" className="btn-primary">Перейти к услугам</Link>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map(order => (
                  <div key={order.order_id} className="order-card">
                    <div className="order-header">
                      <h3>Заказ #{order.order_id}</h3>
                      <span className={`order-status ${order.status}`}>
                        {order.status}
                      </span>
                    </div>
                    
                    <div className="order-details">
                      <p><strong>Дата заказа:</strong> {new Date(order.order_date).toLocaleDateString('ru-RU')}</p>
                      <p><strong>Дата доставки:</strong> {new Date(order.delivery_date).toLocaleDateString('ru-RU')}</p>
                      <p><strong>Адрес:</strong> {order.delivery_address}</p>
                      <p><strong>Сумма:</strong> {order.total_amount} ₽</p>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="order-items">
                        <h4>Услуги:</h4>
                        {order.items.map((item, idx) => (
                          <div key={idx} className="order-item">
                            <span>{item.service_name}</span>
                            <span>{item.quantity} шт. × {item.price} ₽</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ОТЗЫВЫ */}
        {tab === 'reviews' && (
          <div className="reviews-section">
            {reviews.length === 0 ? (
              <div className="empty-reviews">
                <p>Вы еще не оставляли отзывы</p>
                <Link to="/" className="btn-primary">Перейти к услугам</Link>
              </div>
            ) : (
              <div className="reviews-list">
                {reviews.map(review => (
                  <div key={review.review_id} className="review-card">
                    <div className="review-header">
                      <h4>{review.service_name}</h4>
                      <div className="review-rating">
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="review-comment">{review.comment}</p>
                    )}
                    <p className="review-date">
                      {new Date(review.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;