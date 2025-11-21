import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import { toast } from 'react-toastify';
import './Reviews.css';

const API = 'http://localhost:3001/api';

const Reviews = ({ serviceId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  });
  const { user } = useCart();

  useEffect(() => {
    loadReviews();
  }, [serviceId]);

  const loadReviews = async () => {
    try {
      const res = await axios.get(`${API}/services/${serviceId}/reviews`);
      setReviews(res.data);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Войдите, чтобы оставить отзыв');
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
      loadReviews();
    } catch (err) {
      toast.error('Ошибка при добавлении отзыва');
    }
  };

  if (loading) return <div className="loading">Загрузка отзывов...</div>;

  return (
    <div className="reviews-section">
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

      {/* Форма отзыва */}
      {showForm && user && (
        <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="form-group">
            <label>Оценка</label>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  className={`star ${star <= reviewForm.rating ? 'active' : ''}`}
                  onClick={() => setReviewForm({...reviewForm, rating: star})}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Комментарий</label>
            <textarea
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
              placeholder="Расскажите о вашем опыте..."
              rows="4"
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
          <p className="no-reviews">Пока нет отзывов. Будьте первым!</p>
        ) : (
          reviews.map(review => (
            <div key={review.review_id} className="review-card">
              <div className="review-header">
                <strong>{review.full_name || 'Аноним'}</strong>
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
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;