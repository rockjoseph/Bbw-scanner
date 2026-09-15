# 🛁 Bath & Body Works Master Catalog

A modern web application for managing your Bath & Body Works product inventory, pricing, and stock levels.

## Features

- **Product Management**: Add, edit, and delete products with detailed information
- **Inventory Tracking**: Monitor stock levels and track inventory changes with reasons
- **Pricing Management**: Track unit prices and calculate total inventory value
- **Low Stock Alerts**: Automatic alerts for products below minimum stock levels
- **Search & Filter**: Find products by name, SKU, or category
- **Multiple Views**: Grid and table views for browsing products
- **Inventory History**: Log all inventory adjustments with timestamps and reasons

## Tech Stack

- **Frontend**: Next.js + React
- **Backend**: Next.js API Routes
- **Database**: SQLite3
- **Styling**: CSS Modules

## Quick Start

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Initialize the database:
```bash
npm run db:init
```

This creates the SQLite database with sample products.

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
.
├── pages/
│   ├── api/
│   │   └── products/
│   │       ├── index.js           # GET/POST all products
│   │       ├── [id].js            # GET/PUT/DELETE single product
│   │       └── [id]/inventory.js  # Inventory adjustments
│   ├── _app.js                    # Next.js app wrapper
│   └── index.js                   # Homepage
├── components/
│   ├── ProductForm.js             # Add product form
│   ├── ProductList.js             # Product display switcher
│   └── ProductCard.js             # Individual product card
├── styles/
│   ├── globals.css                # Global styles
│   ├── Home.module.css            # Homepage styles
│   ├── Form.module.css            # Form styles
│   ├── ProductList.module.css     # List view styles
│   └── ProductCard.module.css     # Card styles
├── lib/
│   └── db.js                      # Database utilities
├── scripts/
│   └── init-db.js                 # Database initialization
└── data/
    └── catalog.db                 # SQLite database (created after init)
```

## Database Schema

### Products Table
- `id`: Primary key
- `name`: Product name
- `sku`: Stock Keeping Unit (unique identifier)
- `category`: Product category
- `price`: Unit price
- `quantity`: Current stock quantity
- `min_quantity`: Minimum stock level (default: 5)
- `supplier`: Supplier name
- `notes`: Additional notes
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Inventory Log Table
- `id`: Primary key
- `product_id`: Reference to product
- `quantity_change`: Amount added/removed
- `reason`: Reason for change
- `previous_quantity`: Quantity before change
- `new_quantity`: Quantity after change
- `created_at`: Timestamp of change

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `GET /api/products/[id]` - Get product details
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

### Inventory
- `POST /api/products/[id]/inventory` - Adjust inventory
- `GET /api/products/[id]/inventory` - Get inventory history

## Usage

### Adding a Product
1. Click "+ Add Product" button
2. Fill in the product details (name and SKU required)
3. Click "Add Product"

### Adjusting Inventory
1. Click on a product card
2. Click "📦 Adjust Stock" button
3. Enter the quantity change (positive or negative)
4. Optionally add a reason
5. Click "Update"

### Searching & Filtering
- Use the search box to find products by name or SKU
- Use the category dropdown to filter by category

### Switching Views
- Click "⊞ Grid" for card view
- Click "≡ Table" for tabular view

## Sample Data

The database initialization includes three sample products:
- Warm Vanilla Sugar Body Lotion
- Japanese Cherry Blossom Shower Gel
- Mahogany Teakwood 3-Wick Candle

Feel free to delete these and add your own products.

## Color Scheme

The app uses a professional red and white color scheme inspired by Bath & Body Works branding:
- Primary Red: `#c41e3a`
- Secondary Red: `#d63c5c`
- Light backgrounds: `#f5f5f5`, `#ffffff`
- Text: `#333333`, `#666666`

## License

Personal use - Bath & Body Works product catalog management

## Support

For issues or feature requests, please check the GitHub repository or create an issue.
