import { allAsync } from '../../../lib/db';

// Lists every location in use, with how many products and units are stored there.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const locations = await allAsync(
      `SELECT location AS name, COUNT(*) AS products, COALESCE(SUM(quantity), 0) AS units
       FROM products
       WHERE location IS NOT NULL AND location != ''
       GROUP BY location
       ORDER BY location ASC`
    );
    res.status(200).json(locations);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}
