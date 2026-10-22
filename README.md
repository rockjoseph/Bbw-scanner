# 🛁 Bath & Body Works Inventory Scanner & Catalog

A web app for scanning inventory with a phone camera (or a handheld barcode scanner) and recording each product's details and storage location.

## Scanning Inventory (`/scan`)

Open the **📷 Scan** page on your phone, tablet, or computer.

1. **Set your current location** (e.g. `Aisle 3 - Shelf B`). It's remembered on that device and applied to new items you add.
2. **Pick a scan mode**:
   - **Look up**: scan to view a product, adjust stock, edit details, or set its location.
   - **Receive +1**: every scan adds 1 to that product's stock.
   - **Remove −1**: every scan removes 1 from stock.
3. **Scan**: tap **Start Camera Scanner** and point at a barcode. You can also type a code, or use a USB/Bluetooth handheld scanner. These type into the code box and press Enter.
4. **Unknown barcode?** A form opens with the barcode and current location already filled in. Add the name, price, quantity, etc. and save.
5. **Known product?** You'll see its details and location, with −1 / +1 / custom stock buttons, **Set location to "…"** to move it to where you're standing, and **Edit details**.

Supported codes: UPC-A/E, EAN-13/8, Code 128/39/93, ITF, Codabar, QR, and Data Matrix. Products are matched by barcode or SKU.

> **The camera requires HTTPS** (or `localhost`). Browsers block camera access on plain `http://` addresses. See *Using it from your phone* below.

## Features

- **Barcode Scanning**: Phone/tablet camera, handheld scanners, or manual entry
- **Locations**: Record where each product is stored; filter and search the catalog by location
- **Installable**: Add to your phone's home screen to use it like an app
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

(The database is also created automatically on first request if you skip step 2. Existing databases are upgraded with the new `barcode` and `location` columns automatically.)

## Using it from your phone

The server listens on all network interfaces, so other devices on your Wi-Fi can reach it at `http://<your-computer-ip>:3000`.

**For camera scanning you need HTTPS:**

- **On your local network:** run `npm run dev:https`. Next.js creates a self-signed certificate. Open `https://<your-computer-ip>:3000/scan` on your phone and accept the certificate warning once.
- **On the internet (recommended):** deploy it (see below). Hosting platforms provide HTTPS automatically.

On the phone, use **Share → Add to Home Screen** (iOS) or **Install app** (Android/Chrome) to launch it full-screen.

## Deploying to the web

The app stores data in SQLite, so it needs a host with a **persistent disk** (serverless hosts like Vercel or Netlify won't keep the database). A `Dockerfile` is included that works with Render, Railway, or Fly.io:

1. Create a new web service from this repository using the Dockerfile.
2. Attach a persistent volume/disk mounted at `/data` (the database lives at `/data/catalog.db`; override with the `DB_PATH` env var).
3. Expose port `3000`.

Or run it on any server with Docker:

```bash
docker build -t bbw-scanner .
docker run -d -p 3000:3000 -v bbw-data:/data bbw-scanner
```

and put it behind an HTTPS reverse proxy (e.g. Caddy) so the camera works.

> ⚠️ There is no login yet. Anyone with the URL can view and edit inventory, so don't share the link publicly.

## Project Structure

```
.
├── pages/
│   ├── api/
│   │   ├── locations/index.js     # Locations in use, with counts
│   │   └── products/
│   │       ├── index.js           # GET/POST all products
│   │       ├── lookup.js          # Find a product by barcode or SKU
│   │       ├── [id].js            # GET/PUT/DELETE single product
│   │       └── [id]/inventory.js  # Inventory adjustments
│   ├── _app.js                    # App wrapper + nav bar
│   ├── _document.js               # PWA manifest / meta tags
│   ├── index.js                   # Catalog page
│   └── scan.js                    # Scanner page
├── components/
│   ├── BarcodeScanner.js          # Camera barcode scanner
│   ├── NavBar.js                  # Top navigation
│   ├── ProductForm.js             # Add / edit product form
│   ├── ProductList.js             # Product display switcher
│   └── ProductCard.js             # Individual product card
├── styles/
│   ├── globals.css                # Global styles
│   ├── Home.module.css            # Homepage styles
│   ├── Form.module.css            # Form styles
│   ├── ProductList.module.css     # List view styles
│   └── ProductCard.module.css     # Card styles
├── lib/
│   ├── db.js                      # Database utilities
│   ├── schema.js                  # Schema + automatic migrations
│   └── products.js                # Product payload validation
├── scripts/
│   └── init-db.js                 # Database initialization
└── data/
    └── catalog.db                 # SQLite database (created after init)
```

## Database Schema

### Products Table
- `id`: Primary key
- `name`: Product name
- `sku`: Stock Keeping Unit (unique identifier; defaults to the barcode)
- `barcode`: Scanned barcode / UPC
- `category`: Product category
- `location`: Where the product is stored
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
- `GET /api/products/lookup?code=…` - Find a product by barcode or SKU
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `GET /api/products/[id]` - Get product details
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

### Locations
- `GET /api/locations` - List locations with product and unit counts

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
