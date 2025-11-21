import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import { toast } from 'react-toastify';
import ServiceCard from './ServiceCard';
import './ServiceList.css';

const API = 'http://localhost:3001/api';

const ServiceList = ({ selectedCategory }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, user } = useCart();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const url = selectedCategory 
          ? `${API}/services?category_id=${selectedCategory}` 
          : `${API}/services`;
        console.log('Получение услуг из БД');
        const res = await axios.get(url);
        if(res){
          console.log("Услуги получены")
        }
        setServices(res.data);
      } catch (err) {
        toast.error('Ошибка загрузки услуг');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [selectedCategory]);

  const handleAddToCart = async (service) => {
    if (!user) {
      toast.error('Войдите, чтобы добавить в корзину');
      return;
    }

    try {
      await addToCart(service, user.id);
      toast.success('Услуга добавлена в корзину');
    } catch (err) {
      toast.error('Ошибка добавления в корзину');
    }
  };

  if (loading) return <div className="loading">Загрузка услуг...</div>;

  return (
    <div className="service-list">
      <div className="services-grid">
        {services.map(service => (
          <ServiceCard 
            key={service.service_id} 
            service={service} 
            onAdd={() => handleAddToCart(service)} 
          />
        ))}
      </div>
    </div>
  );
};

export default ServiceList;