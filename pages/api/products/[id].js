import { getAsync, runAsync, allAsync } from '../../../lib/db';

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
      const { name, sku, category, price, quantity, supplier, notes } = req.body;

      await runAsync(
        `UPDATE products
         SET name = ?, sku = ?, category = ?, price = ?, quantity = ?, supplier = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, sku, category, price || 0, quantity || 0, supplier || '', notes || '', id]
      );

      res.status(200).json({ id, ...req.body });
    } else if (req.method === 'DELETE') {
      await runAsync('DELETE FROM products WHERE id = ?', [id]);
      res.status(204).end();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}
