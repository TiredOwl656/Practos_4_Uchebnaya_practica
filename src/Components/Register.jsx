import { useState } from 'react';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Register.css';

const API = 'http://localhost:3001/api';

const Register = () => {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    default_address: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useCart();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.full_name) {
      toast.error('Заполните обязательные поля');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Пароль ≥6 символов');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, form);
      login(res.data.user);
      toast.success('Регистрация успешна! Добро пожаловать!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <h2 className="register-title">Регистрация</h2>
          <p className="register-subtitle">Создайте аккаунт</p>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="full_name">Полное имя *</label>
              <input
                id="full_name"
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="Иван Иванов"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="example@mail.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Пароль *</label>
              <input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="минимум 6 символов"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Телефон</label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+79991234567"
              />
            </div>

            <div className="form-group">
              <label htmlFor="default_address">Адрес по умолчанию</label>
              <input
                id="default_address"
                type="text"
                name="default_address"
                value={form.default_address}
                onChange={handleChange}
                placeholder="г. Москва, ул. Примерная, д. 1"
              />
            </div>

            <button 
              type="submit" 
              className="register-btn"
              disabled={loading}
            >
              {loading ? 'Создание...' : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="register-footer">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="login-link">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;