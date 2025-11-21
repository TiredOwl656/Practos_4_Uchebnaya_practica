/**
 * Компонент корзины покупок
 * Отображает выбранные услуги, форму оформления заказа и итоговую стоимость
 * 
 * @component
 * @returns {JSX.Element} Страница корзины
 */

import { useCart } from '../contexts/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useState } from 'react';
import './Cart.css';

const Cart = () => {
  const { state, removeFromCart, clearCart, getTotalPrice, user } = useCart();
  const { items } = state;
  const navigate = useNavigate();
  const [orderForm, setOrderForm] = useState({
    delivery_address: user?.default_address || '',
    delivery_date: ''
  });

    /**
     * Обрабатывает оформление заказа
     * Валидирует данные формы и отправляет запрос на сервер
     * 
     * @returns {Promise<void>}
     */

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Войдите для оформления заказа');
      navigate('/login');
      return;
    }

    if (!orderForm.delivery_address || !orderForm.delivery_date) {
      toast.error('Заполните адрес и дату доставки');
      return;
    }

    // Валидация даты
    const deliveryDate = new Date(orderForm.delivery_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (deliveryDate < today) {
      toast.error('Дата доставки не может быть меньше текущей');
      return;
    }

    try {
      const res = await axios.post('http://localhost:3001/api/orders/create', {
        userId: user.id,
        items: items,
        delivery_address: orderForm.delivery_address,
        delivery_date: orderForm.delivery_date
      });
      
      toast.success('Заказ оформлен успешно!');
      clearCart();
      navigate('/dashboard');
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err.response?.data?.error || 'Ошибка оформления заказа');
    }
  };

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="empty-cart">
          <p>Корзина пуста</p>
          <Link to="/" className="btn-primary">Перейти к услугам</Link>
        </div>
      </div>
    );
  }

  const subtotal = getTotalPrice();

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-header">
          <h2>Корзина</h2>
          <button className="clear-cart-btn" onClick={clearCart}>
            Очистить
          </button>
        </div>

        <div className="cart-content">
          <div className="cart-items">
            {items.map((item, index) => (
              <div 
                key={item.cart_item_id || item.service_id || `cart-item-${index}`} 
                className="cart-item"
              >
                <div className="cart-item-image">
                  <img src={item.image_url || '/placeholder.jpg'} alt={item.name} />
                </div>
                <div className="cart-item-info">
                  <h4>{item.name}</h4>
                  <p className="cart-item-duration">⏱️ {item.duration}</p>
                  <p className="cart-item-price">{item.price} ₽ × {item.quantity}</p>
                </div>
                <div className="cart-item-total">
                  {(item.price * item.quantity).toFixed(2)} ₽
                </div>
                <button 
                  className="remove-btn" 
                  onClick={() => removeFromCart(item.service_id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Форма оформления заказа */}
          <div className="order-form">
            <h3>Оформление заказа</h3>
            <div className="form-group">
              <label>Адрес доставки *</label>
              <input
                type="text"
                value={orderForm.delivery_address}
                onChange={(e) => setOrderForm({...orderForm, delivery_address: e.target.value})}
                placeholder="Введите адрес доставки"
                required
              />
            </div>
            <div className="form-group">
              <label>Дата доставки *</label>
              <input
                type="date"
                value={orderForm.delivery_date}
                onChange={(e) => setOrderForm({...orderForm, delivery_date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          <div className="cart-footer">
            <div className="cart-total-summary">
              <div className="price-row total">
                <span>Итого: </span>
                <span>{subtotal.toFixed(2)} ₽</span>
              </div>
            </div>
            <button 
              className="checkout-btn" 
              onClick={handleCheckout}
              disabled={!user || !orderForm.delivery_address || !orderForm.delivery_date}
            >
              {!user ? 'Войдите для заказа' : 'Оформить заказ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;