import { useState } from 'react';
import axios from 'axios';
import styles from '../styles/ProductCard.module.css';

export default function ProductCard({ product, onDelete, onRefresh }) {
  const [showInventory, setShowInventory] = useState(false);
  const [inventoryChange, setInventoryChange] = useState('');
  const [inventoryReason, setInventoryReason] = useState('');
  const [loading, setLoading] = useState(false);

  const lowStock = product.quantity < (product.min_quantity || 5);
  const itemValue = (product.price * product.quantity).toFixed(2);

  const handleInventoryUpdate = async (e) => {
    e.preventDefault();
    if (!inventoryChange) return;

    try {
      setLoading(true);
      await axios.post(`/api/products/${product.id}/inventory`, {
        quantity_change: parseInt(inventoryChange),
        reason: inventoryReason || 'Manual adjustment'
      });
      setInventoryChange('');
      setInventoryReason('');
      setShowInventory(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to update inventory:', error);
      alert('Failed to update inventory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.card} ${lowStock ? styles.lowStock : ''}`}>
      <div className={styles.header}>
        <h3>{product.name}</h3>
        {lowStock && <span className={styles.badge}>Low Stock</span>}
      </div>

      <div className={styles.sku}>{product.sku}</div>

      {product.category && (
        <div className={styles.category}>{product.category}</div>
      )}

      <div className={styles.pricing}>
        <div className={styles.priceRow}>
          <span>Unit Price:</span>
          <strong>${product.price?.toFixed(2)}</strong>
        </div>
        <div className={styles.quantityRow}>
          <span>Quantity:</span>
          <strong>{product.quantity}</strong>
        </div>
        <div className={styles.totalRow}>
          <span>Total Value:</span>
          <strong className={styles.totalValue}>${itemValue}</strong>
        </div>
      </div>

      {product.supplier && (
        <div className={styles.supplier}>
          <strong>Supplier:</strong> {product.supplier}
        </div>
      )}

      {product.notes && (
        <div className={styles.notes}>
          <strong>Notes:</strong> {product.notes}
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={styles.inventoryBtn}
          onClick={() => setShowInventory(!showInventory)}
        >
          {showInventory ? '✕ Close' : '📦 Adjust Stock'}
        </button>
        <button
          className={styles.deleteBtn}
          onClick={() => onDelete(product.id)}
        >
          🗑️ Delete
        </button>
      </div>

      {showInventory && (
        <form className={styles.inventoryForm} onSubmit={handleInventoryUpdate}>
          <div className={styles.formRow}>
            <input
              type="number"
              value={inventoryChange}
              onChange={(e) => setInventoryChange(e.target.value)}
              placeholder="Change (+ or -)"
              disabled={loading}
            />
          </div>
          <div className={styles.formRow}>
            <input
              type="text"
              value={inventoryReason}
              onChange={(e) => setInventoryReason(e.target.value)}
              placeholder="Reason (optional)"
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update'}
          </button>
        </form>
      )}
    </div>
  );
}
