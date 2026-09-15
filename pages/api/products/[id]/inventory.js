import { runAsync, getAsync, allAsync } from '../../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    if (req.method === 'POST') {
      const { quantity_change, reason } = req.body;

      const product = await getAsync(
        'SELECT quantity FROM products WHERE id = ?',
        [id]
      );

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const newQuantity = product.quantity + quantity_change;

      await runAsync(
        `INSERT INTO inventory_log (product_id, quantity_change, reason, previous_quantity, new_quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [id, quantity_change, reason || '', product.quantity, newQuantity]
      );

      await runAsync(
        'UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newQuantity, id]
      );

      res.status(200).json({ quantity: newQuantity });
    } else if (req.method === 'GET') {
      const logs = await allAsync(
        'SELECT * FROM inventory_log WHERE product_id = ? ORDER BY created_at DESC LIMIT 20',
        [id]
      );
      res.status(200).json(logs);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}
