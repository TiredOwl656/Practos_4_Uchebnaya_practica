/**
 * Контекст для управления корзиной покупок
 * Обеспечивает глобальный доступ к состоянию корзины и методам работы с ней
 * 
 * @context
 */

import { createContext, useContext, useReducer, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const CartContext = createContext();

const initialState = {
  items: [],
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'LOAD':
      return { ...state, items: action.items };
    case 'ADD':
      const existing = state.items.find(i => i.service_id === action.service.service_id);
      
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.service_id === action.service.service_id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        };
      }
      
      return {
        ...state,
        items: [...state.items, { ...action.service, quantity: 1 }]
      };
    case 'REMOVE':
      return {
        ...state,
        items: state.items.filter(i => i.service_id !== action.serviceId)
      };
    case 'CLEAR':
      return { ...state, items: [] };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [user, setUser] = useState(null);

  /**
   * Добавляет услугу в корзину пользователя
   * 
   * @param {Object} service - Объект услуги для добавления
   * @param {number} userId - ID пользователя
   * @returns {Promise<void>}
   */

  const addToCart = async (service, userId) => {
    if (!userId) return;
    
    try {
      await axios.post('http://localhost:3001/api/cart/add', {
        userId,
        service_id: service.service_id,
        quantity: 1
      });
      
      dispatch({
        type: 'ADD',
        service: {
          service_id: service.service_id,
          name: service.name,
          price: service.price,
          duration: service.duration,
          image_url: service.image_url
        }
      });
    } catch (err) {
      console.error('Add to cart error:', err);
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error('Ошибка добавления в корзину');
      }
    }
  };

  const getTotalItems = () => {
    return state.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  /**
   * Удаляет услугу из корзины
   * 
   * @param {number} serviceId - ID услуги для удаления
   * @returns {Promise<void>}
   */

  const removeFromCart = async (serviceId) => {
    if (!user) return;
    try {
      await axios.delete('http://localhost:3001/api/cart/remove', {
        data: { userId: user.id, service_id: serviceId }
      });
      dispatch({ type: 'REMOVE', serviceId });
    } catch (err) {
      console.error('Remove error:', err);
    }
  };

  /**
   * Очищает всю корзину пользователя
   * 
   * @returns {Promise<void>}
   */

  const clearCart = async () => {
    if (!user) return;
    try {
      await axios.delete('http://localhost:3001/api/cart/clear', {
        data: { userId: user.id }
      });
      dispatch({ type: 'CLEAR' });
    } catch (err) {
      console.error('Clear cart error:', err);
    }
  };

  /**
   * Вычисляет общую стоимость товаров в корзине
   * 
   * @returns {number} Общая стоимость
   */

  const getTotalPrice = () => {
    return state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  };

  const loadCart = async (userId) => {
    if (!userId) return;
    try {
      const res = await axios.get(`http://localhost:3001/api/cart/${userId}`);
      dispatch({
        type: 'LOAD',
        items: res.data.items
      });
    } catch (err) {
      console.error('Load cart error:', err);
    }
  };

  const login = (userData) => {
    setUser(userData);
    dispatch({ type: 'CLEAR' });
    loadCart(userData.id);
  };

  const logout = () => {
    setUser(null);
    dispatch({ type: 'CLEAR' });
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      loadCart(parsed.id);
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  return (
    <CartContext.Provider value={{
      state,
      user,
      addToCart,
      removeFromCart,
      clearCart,
      getTotalPrice,
      getTotalItems,
      loadCart,
      login,
      logout
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);