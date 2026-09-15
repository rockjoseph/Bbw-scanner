import { useState } from 'react';
import styles from '../styles/Form.module.css';

export default function ProductForm({ onSubmit, initialData = null }) {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    sku: '',
    category: '',
    price: '',
    quantity: '',
    supplier: '',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.sku) {
      alert('Name and SKU are required');
      return;
    }

    onSubmit({
      ...formData,
      price: parseFloat(formData.price) || 0,
      quantity: parseInt(formData.quantity) || 0
    });

    if (!initialData) {
      setFormData({
        name: '',
        sku: '',
        category: '',
        price: '',
        quantity: '',
        supplier: '',
        notes: ''
      });
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label htmlFor="name">Product Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Warm Vanilla Sugar Body Lotion"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="sku">SKU *</label>
          <input
            type="text"
            id="sku"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            placeholder="e.g., WVS-LOTION-001"
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label htmlFor="category">Category</label>
          <input
            type="text"
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="e.g., Body Lotion"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="price">Price ($)</label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="quantity">Quantity</label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            placeholder="0"
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label htmlFor="supplier">Supplier</label>
          <input
            type="text"
            id="supplier"
            name="supplier"
            value={formData.supplier}
            onChange={handleChange}
            placeholder="Supplier name"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="notes">Notes</label>
          <input
            type="text"
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional notes"
          />
        </div>
      </div>

      <button type="submit" className={styles.submitBtn}>
        {initialData ? 'Update Product' : 'Add Product'}
      </button>
    </form>
  );
}
