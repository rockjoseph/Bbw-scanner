import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import axios from 'axios';
import BarcodeScanner from '../components/BarcodeScanner';
import ProductForm from '../components/ProductForm';
import styles from '../styles/Scanner.module.css';

const LOCATION_KEY = 'bbw.scan.location';
const MODES = [
  { id: 'lookup', label: 'Look up', hint: 'Scan to view, edit, or add a product' },
  { id: 'in', label: 'Receive +1', hint: 'Each scan adds 1 to stock' },
  { id: 'out', label: 'Remove −1', hint: 'Each scan removes 1 from stock' }
];

function errorMessage(error, fallback) {
  return error?.response?.data?.error || fallback;
}

export default function Scan() {
  const [mode, setMode] = useState('lookup');
  const [currentLocation, setCurrentLocation] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null); // { status, code, product?, message? }
  const [editing, setEditing] = useState(false);
  const [adjustBy, setAdjustBy] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const manualInputRef = useRef(null);
  const modeRef = useRef(mode);
  const locationRef = useRef(currentLocation);

  modeRef.current = mode;
  locationRef.current = currentLocation;

  const loadOptions = useCallback(async () => {
    try {
      const [locRes, prodRes] = await Promise.all([
        axios.get('/api/locations'),
        axios.get('/api/products')
      ]);
      setLocations(locRes.data.map(l => l.name));
      setCategories([...new Set(prodRes.data.map(p => p.category).filter(Boolean))]);
    } catch (error) {
      console.error('Failed to load options:', error);
    }
  }, []);

  useEffect(() => {
    loadOptions();
    try {
      setCurrentLocation(localStorage.getItem(LOCATION_KEY) || '');
    } catch (e) {
      // Storage may be unavailable (private mode); location just won't persist.
    }
    // A USB / Bluetooth scanner types into the focused field, so keep it ready on desktops.
    if (window.matchMedia('(pointer: fine)').matches) {
      manualInputRef.current?.focus();
    }
  }, [loadOptions]);

  const updateLocation = (value) => {
    setCurrentLocation(value);
    try {
      localStorage.setItem(LOCATION_KEY, value);
    } catch (e) {
      // ignore
    }
  };

  const logHistory = (code, product, action) => {
    setHistory(prev => [
      { code, name: product?.name || 'Unknown item', action, at: new Date() },
      ...prev
    ].slice(0, 25));
  };

  const adjustStock = async (product, change, reason) => {
    const res = await axios.post(`/api/products/${product.id}/inventory`, {
      quantity_change: change,
      reason
    });
    return res.data;
  };

  const handleScan = useCallback(async (rawCode, { lookupOnly = false } = {}) => {
    const code = rawCode.trim();
    if (!code) return;
    setEditing(false);
    setAdjustBy('');
    setResult({ status: 'loading', code });

    try {
      const { data: product } = await axios.get('/api/products/lookup', { params: { code } });
      const scanMode = lookupOnly ? 'lookup' : modeRef.current;
      if (scanMode === 'lookup') {
        setResult({ status: 'found', code, product });
        logHistory(code, product, 'Looked up');
        return;
      }
      const change = scanMode === 'in' ? 1 : -1;
      const where = locationRef.current ? ` @ ${locationRef.current}` : '';
      const updated = await adjustStock(product, change, `Scan ${change > 0 ? 'received' : 'removed'}${where}`);
      setResult({ status: 'found', code, product: updated, message: `${change > 0 ? '+1' : '−1'} → ${updated.quantity} in stock` });
      logHistory(code, updated, change > 0 ? '+1' : '−1');
    } catch (error) {
      if (error?.response?.status === 404) {
        setResult({ status: 'notfound', code });
        logHistory(code, null, 'Not found');
      } else {
        setResult({ status: 'error', code, message: errorMessage(error, 'Lookup failed') });
      }
    }
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleScan(manualCode);
    setManualCode('');
  };

  const handleCreate = async (productData) => {
    try {
      const { data: product } = await axios.post('/api/products', productData);
      setResult({ status: 'found', code: result.code, product, message: 'Product added' });
      logHistory(result.code, product, 'Added');
      loadOptions();
    } catch (error) {
      alert(errorMessage(error, 'Failed to add product'));
      return false;
    }
  };

  const handleUpdate = async (productData) => {
    try {
      const { data: product } = await axios.put(`/api/products/${result.product.id}`, productData);
      setResult({ ...result, product, message: 'Changes saved' });
      setEditing(false);
      loadOptions();
    } catch (error) {
      alert(errorMessage(error, 'Failed to save product'));
      return false;
    }
  };

  const handleAdjust = async (change) => {
    if (!change) return;
    setBusy(true);
    try {
      const where = currentLocation ? ` @ ${currentLocation}` : '';
      const product = await adjustStock(result.product, change, `Scan adjustment${where}`);
      setResult({ ...result, product, message: `${change > 0 ? '+' : ''}${change} → ${product.quantity} in stock` });
      setAdjustBy('');
    } catch (error) {
      alert(errorMessage(error, 'Failed to update stock'));
    } finally {
      setBusy(false);
    }
  };

  const handleMoveHere = async () => {
    setBusy(true);
    try {
      const { data: product } = await axios.put(`/api/products/${result.product.id}`, {
        ...result.product,
        location: currentLocation
      });
      setResult({ ...result, product, message: `Moved to ${currentLocation}` });
      loadOptions();
    } catch (error) {
      alert(errorMessage(error, 'Failed to update location'));
    } finally {
      setBusy(false);
    }
  };

  const product = result?.product;
  const lowStock = product && product.quantity < (product.min_quantity ?? 5);

  return (
    <div className={styles.page}>
      <Head>
        <title>Scan Inventory · BBW Catalog</title>
      </Head>

      <section className={styles.panel}>
        <label className={styles.label} htmlFor="current-location">📍 Current location</label>
        <input
          id="current-location"
          className={styles.locationInput}
          type="text"
          value={currentLocation}
          onChange={(e) => updateLocation(e.target.value)}
          placeholder="e.g., Aisle 3 - Shelf B (applied to new items)"
          list="scan-location-options"
        />
        <datalist id="scan-location-options">
          {locations.map(loc => <option key={loc} value={loc} />)}
        </datalist>

        <div className={styles.modes} role="radiogroup" aria-label="Scan mode">
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              className={`${styles.modeBtn} ${mode === m.id ? styles.modeActive : ''}`}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className={styles.hint}>{MODES.find(m => m.id === mode).hint}</p>
      </section>

      <section className={styles.panel}>
        <BarcodeScanner onScan={handleScan} />

        <form className={styles.manual} onSubmit={handleManualSubmit}>
          <input
            ref={manualInputRef}
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Type a barcode / SKU, or use a handheld scanner"
            aria-label="Barcode or SKU"
            autoComplete="off"
          />
          <button type="submit">Go</button>
        </form>
      </section>

      {result && (
        <section className={styles.panel} aria-live="polite">
          {result.status === 'loading' && (
            <p className={styles.muted}>Looking up <code>{result.code}</code>…</p>
          )}

          {result.status === 'error' && (
            <p className={styles.error}>{result.message}</p>
          )}

          {result.status === 'notfound' && (
            <>
              <div className={styles.resultHeader}>
                <h2>New item</h2>
                <code className={styles.code}>{result.code}</code>
              </div>
              <p className={styles.muted}>No product matches this code yet. Add its details:</p>
              <ProductForm
                key={result.code}
                onSubmit={handleCreate}
                initialData={{
                  barcode: result.code,
                  location: currentLocation,
                  quantity: mode === 'in' ? 1 : ''
                }}
                locations={locations}
                categories={categories}
                submitLabel="Save New Product"
                onCancel={() => setResult(null)}
              />
            </>
          )}

          {result.status === 'found' && product && !editing && (
            <>
              {result.message && <p className={styles.success}>✓ {result.message}</p>}
              <div className={styles.resultHeader}>
                <h2>{product.name}</h2>
                {lowStock && <span className={styles.lowBadge}>Low Stock</span>}
              </div>

              <dl className={styles.details}>
                <div><dt>Location</dt><dd>{product.location || <em>Not set</em>}</dd></div>
                <div><dt>In stock</dt><dd className={styles.qty}>{product.quantity}</dd></div>
                <div><dt>Barcode</dt><dd><code>{product.barcode || '—'}</code></dd></div>
                <div><dt>SKU</dt><dd><code>{product.sku}</code></dd></div>
                {product.category && <div><dt>Category</dt><dd>{product.category}</dd></div>}
                <div><dt>Price</dt><dd>${(product.price || 0).toFixed(2)}</dd></div>
                {product.supplier && <div><dt>Supplier</dt><dd>{product.supplier}</dd></div>}
                {product.notes && <div><dt>Notes</dt><dd>{product.notes}</dd></div>}
              </dl>

              <div className={styles.stockControls}>
                <button type="button" disabled={busy} onClick={() => handleAdjust(-1)}>−1</button>
                <button type="button" disabled={busy} onClick={() => handleAdjust(1)}>+1</button>
                <form
                  className={styles.adjustForm}
                  onSubmit={(e) => { e.preventDefault(); handleAdjust(parseInt(adjustBy)); }}
                >
                  <input
                    type="number"
                    inputMode="numeric"
                    value={adjustBy}
                    onChange={(e) => setAdjustBy(e.target.value)}
                    placeholder="± qty"
                    aria-label="Adjust stock by"
                  />
                  <button type="submit" disabled={busy || !parseInt(adjustBy)}>Apply</button>
                </form>
              </div>

              <div className={styles.actions}>
                {currentLocation && product.location !== currentLocation && (
                  <button type="button" className={styles.primaryBtn} disabled={busy} onClick={handleMoveHere}>
                    📍 Set location to “{currentLocation}”
                  </button>
                )}
                <button type="button" className={styles.secondaryBtn} onClick={() => setEditing(true)}>
                  ✎ Edit details
                </button>
                <button type="button" className={styles.secondaryBtn} onClick={() => setResult(null)}>
                  Done
                </button>
              </div>
            </>
          )}

          {result.status === 'found' && product && editing && (
            <>
              <div className={styles.resultHeader}>
                <h2>Edit product</h2>
              </div>
              <ProductForm
                key={`edit-${product.id}`}
                isEdit
                initialData={product}
                onSubmit={handleUpdate}
                locations={locations}
                categories={categories}
                onCancel={() => setEditing(false)}
              />
            </>
          )}
        </section>
      )}

      {history.length > 0 && (
        <section className={styles.panel}>
          <h3 className={styles.historyTitle}>Recent scans</h3>
          <ul className={styles.history}>
            {history.map((h, i) => (
              <li key={i}>
                <button type="button" onClick={() => handleScan(h.code, { lookupOnly: true })}>
                  <span className={styles.historyName}>{h.name}</span>
                  <code>{h.code}</code>
                  <span className={styles.historyAction}>{h.action}</span>
                  <span className={styles.historyTime}>
                    {h.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
