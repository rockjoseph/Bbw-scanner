import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import ProductForm from '../components/ProductForm';
import ProductList from '../components/ProductList';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (productData) => {
    try {
      await axios.post('/api/products', productData);
      setShowForm(false);
      fetchProducts();
    } catch (error) {
      console.error('Failed to add product:', error);
      alert(error?.response?.data?.error || 'Failed to add product');
      return false;
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await axios.delete(`/api/products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const locations = [...new Set(products.map(p => p.location).filter(Boolean))].sort();

  let filteredProducts = products;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter(p =>
      [p.name, p.sku, p.barcode, p.location].some(v => (v || '').toLowerCase().includes(term))
    );
  }
  if (selectedCategory) {
    filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
  }
  if (selectedLocation) {
    filteredProducts = filteredProducts.filter(p => p.location === selectedLocation);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🛁 Bath & Body Works Catalog</h1>
        <p>Master product inventory and pricing management</p>
      </header>

      <main className={styles.main}>
        <div className={styles.controls}>
          <Link href="/scan" className={styles.scanBtn}>
            📷 Scan Inventory
          </Link>

          <button
            className={styles.addBtn}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '✕ Cancel' : '+ Add Product'}
          </button>

          <input
            type="text"
            placeholder="Search name, SKU, barcode, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />

          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.categoryFilter}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          {locations.length > 0 && (
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className={styles.categoryFilter}
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          )}
        </div>

        {showForm && (
          <div className={styles.formContainer}>
            <ProductForm
              onSubmit={handleAddProduct}
              locations={locations}
              categories={categories}
            />
          </div>
        )}

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Total Products</span>
            <span className={styles.statValue}>{products.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Total Value</span>
            <span className={styles.statValue}>
              ${(products.reduce((sum, p) => sum + (p.price * p.quantity), 0)).toFixed(2)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Locations</span>
            <span className={styles.statValue}>{locations.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Low Stock</span>
            <span className={styles.statValue}>
              {products.filter(p => p.quantity < (p.min_quantity ?? 5)).length}
            </span>
          </div>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading products...</p>
        ) : (
          <ProductList
            products={filteredProducts}
            onDelete={handleDeleteProduct}
            onRefresh={fetchProducts}
          />
        )}
      </main>
    </div>
  );
}
