import { getAsync } from '../../../lib/db';

// Finds a product by a scanned code, matching either its barcode or SKU.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const code = (req.query.code || '').trim();
  if (!code) {
    return res.status(400).json({ error: 'code is required' });
  }

  try {
    const product = await getAsync(
      `SELECT * FROM products
       WHERE barcode = ? OR sku = ? COLLATE NOCASE
       ORDER BY barcode = ? DESC
       LIMIT 1`,
      [code, code, code]
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found', code });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}
