import { useState } from 'react';
import ProductCard from './ProductCard';
import styles from '../styles/ProductList.module.css';

export default function ProductList({ products, onDelete, onRefresh }) {
  const [viewMode, setViewMode] = useState('grid'); // grid or table

  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No products found. Start by adding a product!</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.active : ''}`}
          onClick={() => setViewMode('grid')}
        >
          ⊞ Grid
        </button>
        <button
          className={`${styles.toggleBtn} ${viewMode === 'table' ? styles.active : ''}`}
          onClick={() => setViewMode('table')}
        >
          ≡ Table
        </button>
      </div>

      {viewMode === 'grid' ? (
        <div className={styles.grid}>
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={onDelete}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.sku}</td>
                  <td>{product.category || '-'}</td>
                  <td>${product.price?.toFixed(2)}</td>
                  <td>{product.quantity}</td>
                  <td>${(product.price * product.quantity).toFixed(2)}</td>
                  <td>
                    {product.quantity < (product.min_quantity || 5) ? (
                      <span className={styles.lowStock}>Low Stock</span>
                    ) : (
                      <span className={styles.inStock}>In Stock</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => onDelete(product.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
