import { allAsync, runAsync } from '../../../lib/db';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const products = await allAsync(
        'SELECT * FROM products ORDER BY name ASC'
      );
      res.status(200).json(products);
    } else if (req.method === 'POST') {
      const { name, sku, category, price, quantity, supplier, notes } = req.body;

      if (!name || !sku) {
        return res.status(400).json({ error: 'Name and SKU are required' });
      }

      const result = await runAsync(
        `INSERT INTO products (name, sku, category, price, quantity, supplier, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, sku, category, price || 0, quantity || 0, supplier || '', notes || '']
      );

      res.status(201).json({ id: result.id, ...req.body });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}
