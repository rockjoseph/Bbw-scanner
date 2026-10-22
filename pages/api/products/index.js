import { allAsync, getAsync, runAsync } from '../../../lib/db';
import { productFields, isUniqueViolation } from '../../../lib/products';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const products = await allAsync(
        'SELECT * FROM products ORDER BY name ASC'
      );
      res.status(200).json(products);
    } else if (req.method === 'POST') {
      const p = productFields(req.body);

      if (!p.name || !p.sku) {
        return res.status(400).json({ error: 'Name and SKU (or barcode) are required' });
      }

      const result = await runAsync(
        `INSERT INTO products (name, sku, barcode, category, location, price, quantity, min_quantity, supplier, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.name, p.sku, p.barcode, p.category, p.location, p.price, p.quantity, p.min_quantity, p.supplier, p.notes]
      );

      if (p.quantity) {
        await runAsync(
          `INSERT INTO inventory_log (product_id, quantity_change, reason, previous_quantity, new_quantity)
           VALUES (?, ?, ?, 0, ?)`,
          [result.id, p.quantity, 'Initial stock', p.quantity]
        );
      }

      const product = await getAsync('SELECT * FROM products WHERE id = ?', [result.id]);
      res.status(201).json(product);
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
