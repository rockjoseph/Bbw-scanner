// Normalizes a product payload from the client into DB column values.
function productFields(body) {
  const { name, sku, barcode, category, location, price, quantity, min_quantity, supplier, notes } = body;
  const cleanBarcode = (barcode || '').trim();
  return {
    name: (name || '').trim(),
    // Fall back to the barcode so scanned items don't need a separate SKU.
    sku: (sku || '').trim() || cleanBarcode,
    barcode: cleanBarcode,
    category: category || '',
    location: (location || '').trim(),
    price: parseFloat(price) || 0,
    quantity: parseInt(quantity) || 0,
    min_quantity: min_quantity === undefined || min_quantity === '' ? 5 : parseInt(min_quantity) || 0,
    supplier: supplier || '',
    notes: notes || '',
  };
}

function isUniqueViolation(error) {
  return error && error.code === 'SQLITE_CONSTRAINT' && /UNIQUE/.test(error.message);
}

module.exports = { productFields, isUniqueViolation };
