import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import './ServiceCard.css';
import { toast } from 'react-toastify';
import Reviews from './Reviews';

const ServiceCard = ({ service, onAdd }) => {
  const { 
    service_id,
    name, 
    price, 
    duration, 
    image_url,
    description 
  } = service;

  const { user } = useCart();
  const [showReviews, setShowReviews] = useState(false);
  const isAdmin = user?.role_id === 2;

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Войдите, чтобы добавить в корзину');
      return;
    }

    if (isAdmin) {
      toast.info('Администраторы не могут совершать покупки');
      return;
    }

    onAdd();
  };

  return (
    <div className="service-card">
      <div className="service-image">
        <img 
          src={image_url || '/placeholder.jpg'} 
          alt={name} 
          loading="lazy"
        />
      </div>
      <div className="service-info">
        <h3 className="service-name">{name}</h3>
        <p className="service-description">{description}</p>
        <p className="service-duration">⏱️ {duration}</p>
        <p className="service-price">
          {parseFloat(price).toFixed(2)} ₽
        </p>
        
        <div className="service-actions">
          {/* Для админов не показываем кнопку корзины */}
          {!isAdmin && (
            <button 
              className="add-to-cart"
              onClick={handleAddToCart}
            >
              В корзину
            </button>
          )}
          <button 
            className="reviews-toggle"
            onClick={() => setShowReviews(!showReviews)}
          >
            {showReviews ? 'Скрыть отзывы' : 'Показать отзывы'}
          </button>
        </div>
      </div>

      {showReviews && <Reviews serviceId={service_id} />}
    </div>
  );
};

export default ServiceCard;