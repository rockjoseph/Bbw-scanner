import { useState } from 'react';
import styles from '../styles/Form.module.css';

const EMPTY = {
  name: '',
  sku: '',
  barcode: '',
  category: '',
  location: '',
  price: '',
  quantity: '',
  min_quantity: '',
  supplier: '',
  notes: ''
};

function toFormValues(data) {
  const values = { ...EMPTY };
  for (const key of Object.keys(EMPTY)) {
    if (data && data[key] !== null && data[key] !== undefined) {
      values[key] = String(data[key]);
    }
  }
  return values;
}

export default function ProductForm({
  onSubmit,
  initialData = null,
  isEdit = false,
  locations = [],
  categories = [],
  submitLabel,
  onCancel
}) {
  const [formData, setFormData] = useState(() => toFormValues(initialData));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !(formData.sku || formData.barcode)) {
      alert('Name and SKU (or barcode) are required');
      return;
    }

    const saved = await onSubmit({
      ...formData,
      price: parseFloat(formData.price) || 0,
      quantity: parseInt(formData.quantity) || 0,
      min_quantity: formData.min_quantity === '' ? 5 : parseInt(formData.min_quantity) || 0
    });

    if (!isEdit && saved !== false) {
      setFormData(toFormValues(null));
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
            autoFocus={!isEdit}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="barcode">Barcode / UPC</label>
          <input
            type="text"
            id="barcode"
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
            placeholder="Scan or type barcode"
            inputMode="numeric"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="sku">SKU</label>
          <input
            type="text"
            id="sku"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            placeholder="Defaults to barcode"
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label htmlFor="location">Location</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., Aisle 3 - Shelf B"
            list="location-options"
          />
          <datalist id="location-options">
            {locations.map(loc => <option key={loc} value={loc} />)}
          </datalist>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="category">Category</label>
          <input
            type="text"
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="e.g., Body Lotion"
            list="category-options"
          />
          <datalist id="category-options">
            {categories.map(cat => <option key={cat} value={cat} />)}
          </datalist>
        </div>
      </div>

      <div className={styles.row}>
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
            inputMode="decimal"
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
            inputMode="numeric"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="min_quantity">Low-stock alert at</label>
          <input
            type="number"
            id="min_quantity"
            name="min_quantity"
            value={formData.min_quantity}
            onChange={handleChange}
            placeholder="5"
            inputMode="numeric"
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

      <div className={styles.buttons}>
        <button type="submit" className={styles.submitBtn}>
          {submitLabel || (isEdit ? 'Save Changes' : 'Add Product')}
        </button>
        {onCancel && (
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
