import { NavLink } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import "./Navigation.css";

const Navigation = () => {
  const { getTotalItems, user } = useCart();
  const totalItems = getTotalItems();
  const isAdmin = user?.role_id === 2;

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <NavLink to="/">Магазин Бесполезных Услуг</NavLink>
      </div>

      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Главная
        </NavLink>
        
        {user ? (
          <>
            {/* Для обычных пользователей показываем корзину, для админов - нет */}
            {!isAdmin && (
              <NavLink to="/cart" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Корзина {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
              </NavLink>
            )}
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Личный кабинет
            </NavLink>
          </>
        ) : (
          <NavLink to="/login" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Вход
          </NavLink>
        )}
      </div>

      <div className="nav-controls">
        {user && (
          <span className="user-email">
            {user.email} {isAdmin && '(Админ)'}
          </span>
        )}
      </div>
    </nav>
  );
};

export default Navigation;