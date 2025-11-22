import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import { toast } from 'react-toastify';
import './Reviews.css';

const API = 'http://localhost:3001/api';

/**
 * Компонент для работы с отзывами на услуги
 * Показывает существующие отзывы и форму для добавления новых
 * 
 * @component
 * @param {Object} props - Свойства компонента
 * @param {number} props.serviceId - ID услуги для отзывов
 * @returns {JSX.Element} Блок отзывов
 */
const Reviews = ({ serviceId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  });
  const { user } = useCart();

  /**
   * Загружает отзывы для текущей услуги
   * 
   * @returns {Promise<void>}
   */
  const loadReviews = async () => {
    try {
      const res = await axios.get(`${API}/services/${serviceId}/reviews`);
      setReviews(res.data);
    } catch (err) {
      console.error('Error loading reviews:', err);
      toast.error('Ошибка загрузки отзывов');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем отзывы при монтировании компонента
  useEffect(() => {
    loadReviews();
  }, [serviceId]);

  /**
   * Отправляет новый отзыв на сервер
   * 
   * @param {Event} e - Событие формы
   * @returns {Promise<void>}
   */
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Войдите, чтобы оставить отзыв');
      return;
    }

    if (!reviewForm.rating) {
      toast.error('Выберите оценку');
      return;
    }

    try {
      await axios.post(`${API}/services/${serviceId}/reviews`, {
        user_id: user.id,
        ...reviewForm
      });
      
      toast.success('Отзыв добавлен!');
      setReviewForm({ rating: 5, comment: '' });
      setShowForm(false);
      loadReviews(); // Перезагружаем список отзывов
    } catch (err) {
      console.error('Error submitting review:', err);
      toast.error('Ошибка при добавлении отзыва');
    }
  };

  // Показываем индикатор загрузки
  if (loading) {
    return (
      <div className="reviews-section">
        <div className="loading">Загрузка отзывов...</div>
      </div>
    );
  }

  return (
    <div className="reviews-section">
      {/* Заголовок и кнопка добавления отзыва */}
      <div className="reviews-header">
        <h3>Отзывы ({reviews.length})</h3>
        {user && (
          <button 
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Отмена' : 'Написать отзыв'}
          </button>
        )}
      </div>

      {/* Форма добавления отзыва */}
      {showForm && user && (
        <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="rating-container">
            <label className="rating-label">Оценка *</label>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  className={`star ${star <= reviewForm.rating ? 'active' : ''}`}
                  onClick={() => setReviewForm({...reviewForm, rating: star})}
                  aria-label={`Оценка ${star} звезд`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="rating-label">Комментарий</label>
            <textarea
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
              placeholder="Расскажите о вашем опыте..."
              rows="4"
              maxLength="500"
            />
          </div>

          <button type="submit" className="btn-primary">
            Отправить отзыв
          </button>
        </form>
      )}

      {/* Список отзывов */}
      <div className="reviews-list">
        {reviews.length === 0 ? (
          <div className="no-reviews">
            Пока нет отзывов. Будьте первым!
          </div>
        ) : (
          reviews.map(review => (
            <div key={review.review_id} className="review-card">
              <div className="review-header">
                <div className="review-user">
                  <strong>{review.full_name || 'Аноним'}</strong>
                </div>
                <div className="review-rating-container">
                  <div 
                    className="review-rating"
                    aria-label={`Рейтинг: ${review.rating} из 5 звезд`}
                  >
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </div>
                </div>
              </div>

              {review.comment && (
                <p className="review-comment">{review.comment}</p>
              )}

              <p className="review-date">
                {new Date(review.created_at).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Подсказка для неавторизованных пользователей */}
      {!user && reviews.length === 0 && (
        <div className="no-reviews">
          Войдите, чтобы оставить первый отзыв!
        </div>
      )}
    </div>
  );
};

export default Reviews;