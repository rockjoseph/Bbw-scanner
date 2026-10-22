import { getAsync, runAsync } from '../../../lib/db';
import { productFields, isUniqueViolation } from '../../../lib/products';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const product = await getAsync(
        'SELECT * FROM products WHERE id = ?',
        [id]
      );
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.status(200).json(product);
    } else if (req.method === 'PUT') {
      const p = productFields(req.body);

      if (!p.name || !p.sku) {
        return res.status(400).json({ error: 'Name and SKU (or barcode) are required' });
      }

      const result = await runAsync(
        `UPDATE products
         SET name = ?, sku = ?, barcode = ?, category = ?, location = ?, price = ?, quantity = ?,
             min_quantity = ?, supplier = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [p.name, p.sku, p.barcode, p.category, p.location, p.price, p.quantity, p.min_quantity, p.supplier, p.notes, id]
      );
      if (!result.changes) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const product = await getAsync('SELECT * FROM products WHERE id = ?', [id]);
      res.status(200).json(product);
    } else if (req.method === 'DELETE') {
      await runAsync('DELETE FROM inventory_log WHERE product_id = ?', [id]);
      await runAsync('DELETE FROM products WHERE id = ?', [id]);
      res.status(204).end();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'A product with that SKU already exists' });
    }
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}
