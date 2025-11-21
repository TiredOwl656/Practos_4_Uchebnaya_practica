import { useState } from 'react';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Login.css';

const API = 'http://localhost:3001/api';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useCart();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, form);
      login(res.data.user, res.data.personalDiscount);
      toast.success('Вход выполнен');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h2 className="login-title">Вход в аккаунт</h2>
          <p className="login-subtitle">Введите email и пароль</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
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
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              className="login-btn"
              disabled={loading}
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <p className="login-footer">
            Нет аккаунта?{' '}
            <Link to="/register" className="register-link">
                Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;