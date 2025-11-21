import { useState, useEffect } from 'react';
import axios from 'axios';
import './CategoriesAside.css';

const API = 'http://localhost:3001/api';

const CategoriesAside = ({ onFilter }) => {
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get(`${API}/categories`)
      .then(res => setCategories(res.data))
      .catch(() => {});
  }, []);

  const handleChange = (id) => {
    const newSelected = selected === id ? null : id;
    setSelected(newSelected);
    onFilter(newSelected);
  };

  return (
    <aside className="categories-aside">
      <h3>Категории</h3>
      {categories.map(cat => (
        <label key={cat.category_id} className="category-item">
          <input
            type="checkbox"
            checked={selected === cat.category_id}
            onChange={() => handleChange(cat.category_id)}
          />
          <span>{cat.category_name}</span>
        </label>
      ))}
    </aside>
  );
};

export default CategoriesAside;