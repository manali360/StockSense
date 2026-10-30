const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const { connectDB, closeDB } = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const StockMovement = require('../models/StockMovement');
const Notification = require('../models/Notification');
const { checkAndTriggerStockAlert } = require('../services/alertService');

const categories = [
  'Industrial Tools',
  'Safety & PPE',
  'Packaging & Shipping',
  'Electronics & Hardware',
  'Electrical Components',
  'Automotive Parts',
  'Office & Facilities',
  'Raw Materials'
];

const brands = [
  'DeWalt', '3M', 'Bosch', 'Milwaukee', 'Uline', 'Schneider Electric',
  'Anker', 'Fluke', 'Honeywell', 'Stanley', 'Makita', 'Grainger'
];

const suppliers = [
  'Apex Industrial Supply',
  'Global Logistics Distribution',
  'Prime Hardware Direct',
  'Safeguard Equipment Corp',
  'Pinnacle Component Co.'
];

const warehouseZones = [
  'Zone A - Aisle 1',
  'Zone A - Aisle 3',
  'Zone B - Bay 4',
  'Zone B - Bay 12',
  'Zone C - High Rack 2',
  'Zone C - High Rack 5',
  'Zone D - Cold Bay',
  'Zone E - Bulk Staging'
];

const curatedProducts = [
  // Industrial Tools
  { name: 'Cordless Brushless Hammer Drill 20V', sku: 'IND-DRL-001', category: 'Industrial Tools', brand: 'DeWalt', purchasePrice: 85.00, sellingPrice: 149.99, availableQuantity: 34, minimumStockThreshold: 10, supplierName: 'Apex Industrial Supply', warehouseLocation: 'Zone A - Aisle 1' },
  { name: 'Variable Speed Heavy Duty Angle Grinder', sku: 'IND-GRD-002', category: 'Industrial Tools', brand: 'Bosch', purchasePrice: 48.00, sellingPrice: 89.50, availableQuantity: 6, minimumStockThreshold: 10, supplierName: 'Apex Industrial Supply', warehouseLocation: 'Zone A - Aisle 1' }, // Low stock
  { name: 'Rotary Hammer SDS-Plus Drill Kit', sku: 'IND-ROT-003', category: 'Industrial Tools', brand: 'Milwaukee', purchasePrice: 160.00, sellingPrice: 279.00, availableQuantity: 0, minimumStockThreshold: 5, supplierName: 'Apex Industrial Supply', warehouseLocation: 'Zone A - Aisle 3' }, // Out of stock
  { name: 'High-Torque Impact Wrench 1/2-Inch', sku: 'IND-IMP-004', category: 'Industrial Tools', brand: 'Milwaukee', purchasePrice: 110.00, sellingPrice: 199.99, availableQuantity: 18, minimumStockThreshold: 8, supplierName: 'Prime Hardware Direct', warehouseLocation: 'Zone A - Aisle 3' },
  { name: 'Compact Reciprocating Saw 18V', sku: 'IND-SAW-005', category: 'Industrial Tools', brand: 'Makita', purchasePrice: 75.00, sellingPrice: 135.00, availableQuantity: 4, minimumStockThreshold: 6, supplierName: 'Prime Hardware Direct', warehouseLocation: 'Zone A - Aisle 3' }, // Low stock
  { name: 'Industrial Heat Gun with Digital Display', sku: 'IND-HGN-006', category: 'Industrial Tools', brand: 'DeWalt', purchasePrice: 32.00, sellingPrice: 59.90, availableQuantity: 42, minimumStockThreshold: 12, supplierName: 'Apex Industrial Supply', warehouseLocation: 'Zone A - Aisle 1' },
  { name: 'Precision Dial Caliper 0-6 Inch Stainless', sku: 'IND-CAL-007', category: 'Industrial Tools', brand: 'Stanley', purchasePrice: 22.00, sellingPrice: 44.50, availableQuantity: 19, minimumStockThreshold: 5, supplierName: 'Prime Hardware Direct', warehouseLocation: 'Zone B - Bay 4' },
  { name: 'Magnetic Base Heavy Duty Bench Vise 6-Inch', sku: 'IND-VIS-008', category: 'Industrial Tools', brand: 'Stanley', purchasePrice: 65.00, sellingPrice: 119.00, availableQuantity: 12, minimumStockThreshold: 4, supplierName: 'Apex Industrial Supply', warehouseLocation: 'Zone E - Bulk Staging' },

  // Safety & PPE
  { name: 'Full Brim Vented Hard Hat with Ratchet', sku: 'SAF-HAT-010', category: 'Safety & PPE', brand: '3M', purchasePrice: 12.50, sellingPrice: 24.99, availableQuantity: 85, minimumStockThreshold: 20, supplierName: 'Safeguard Equipment Corp', warehouseLocation: 'Zone B - Bay 4' },
  { name: 'Anti-Fog Impact Resistant Safety Goggles', sku: 'SAF-GOG-011', category: 'Safety & PPE', brand: 'Honeywell', purchasePrice: 4.80, sellingPrice: 10.50, availableQuantity: 140, minimumStockThreshold: 30, supplierName: 'Safeguard Equipment Corp', warehouseLocation: 'Zone B - Bay 4' },
  { name: 'N95 Particulate Respirator Box of 20', sku: 'SAF-RES-012', category: 'Safety & PPE', brand: '3M', purchasePrice: 16.00, sellingPrice: 32.00, availableQuantity: 8, minimumStockThreshold: 15, supplierName: 'Safeguard Equipment Corp', warehouseLocation: 'Zone B - Bay 4' }, // Low stock
  { name: 'Cut-Resistant Nitrile Coated Gloves (Pair)', sku: 'SAF-GLV-013', category: 'Safety & PPE', brand: '3M', purchasePrice: 3.20, sellingPrice: 7.99, availableQuantity: 210, minimumStockThreshold: 50, supplierName: 'Safeguard Equipment Corp', warehouseLocation: 'Zone B - Bay 12' },
  { name: 'High-Visibility Class 2 Reflective Safety Vest', sku: 'SAF-VST-014', category: 'Safety & PPE', brand: 'Honeywell', purchasePrice: 6.50, sellingPrice: 14.99, availableQuantity: 0, minimumStockThreshold: 25, supplierName: 'Safeguard Equipment Corp', warehouseLocation: 'Zone B - Bay 12' }, // Out of stock
  { name: 'Hearing Protection Earmuffs 28dB NRR', sku: 'SAF-EAR-015', category: 'Safety & PPE', brand: '3M', purchasePrice: 11.20, sellingPrice: 22.95, availableQuantity: 38, minimumStockThreshold: 10, supplierName: 'Safeguard Equipment Corp', warehouseLocation: 'Zone B - Bay 4' },
  { name: 'Emergency Eye Wash Station Wall Mount 32oz', sku: 'SAF-EYE-016', category: 'Safety & PPE', brand: 'Honeywell', purchasePrice: 28.00, sellingPrice: 54.00, availableQuantity: 14, minimumStockThreshold: 5, supplierName: 'Safeguard Equipment Corp', warehouseLocation: 'Zone B - Bay 12' },

  // Packaging & Shipping
  { name: 'Heavy Duty Corrugated Boxes 16x12x12 (Bundle 25)', sku: 'PKG-BOX-020', category: 'Packaging & Shipping', brand: 'Uline', purchasePrice: 26.00, sellingPrice: 48.00, availableQuantity: 52, minimumStockThreshold: 15, supplierName: 'Global Logistics Distribution', warehouseLocation: 'Zone E - Bulk Staging' },
  { name: 'Clear Heavy Duty Shipping Tape 3-Inch (Roll of 6)', sku: 'PKG-TAP-021', category: 'Packaging & Shipping', brand: 'Uline', purchasePrice: 14.50, sellingPrice: 28.99, availableQuantity: 94, minimumStockThreshold: 20, supplierName: 'Global Logistics Distribution', warehouseLocation: 'Zone B - Bay 12' },
  { name: 'Industrial Stretch Wrap Film 18-Inch x 1500ft', sku: 'PKG-WRP-022', category: 'Packaging & Shipping', brand: 'Uline', purchasePrice: 18.00, sellingPrice: 36.50, availableQuantity: 5, minimumStockThreshold: 12, supplierName: 'Global Logistics Distribution', warehouseLocation: 'Zone E - Bulk Staging' }, // Low stock
  { name: 'Bubble Cushioning Roll 12-Inch x 250ft Perforated', sku: 'PKG-BUB-023', category: 'Packaging & Shipping', brand: 'Uline', purchasePrice: 21.00, sellingPrice: 42.00, availableQuantity: 28, minimumStockThreshold: 10, supplierName: 'Global Logistics Distribution', warehouseLocation: 'Zone E - Bulk Staging' },
  { name: 'Thermal Transfer Shipping Labels 4x6 (Roll 1000)', sku: 'PKG-LBL-024', category: 'Packaging & Shipping', brand: 'Uline', purchasePrice: 12.00, sellingPrice: 23.50, availableQuantity: 62, minimumStockThreshold: 15, supplierName: 'Global Logistics Distribution', warehouseLocation: 'Zone B - Bay 12' },
  { name: 'Adjustable Hand Cart Pistol-Grip Tape Dispenser', sku: 'PKG-DSP-025', category: 'Packaging & Shipping', brand: 'Uline', purchasePrice: 9.80, sellingPrice: 19.99, availableQuantity: 0, minimumStockThreshold: 10, supplierName: 'Global Logistics Distribution', warehouseLocation: 'Zone B - Bay 12' }, // Out of stock

  // Electronics & Hardware
  { name: 'True-RMS Digital Industrial Multimeter 600V', sku: 'ELE-MUL-030', category: 'Electronics & Hardware', brand: 'Fluke', purchasePrice: 120.00, sellingPrice: 219.00, availableQuantity: 15, minimumStockThreshold: 5, supplierName: 'Pinnacle Component Co.', warehouseLocation: 'Zone C - High Rack 2' },
  { name: 'Non-Contact Voltage Detector Pen 1000V AC', sku: 'ELE-VLT-031', category: 'Electronics & Hardware', brand: 'Fluke', purchasePrice: 16.00, sellingPrice: 32.50, availableQuantity: 44, minimumStockThreshold: 10, supplierName: 'Pinnacle Component Co.', warehouseLocation: 'Zone C - High Rack 2' },
  { name: 'Industrial Uninterruptible Power Supply 1500VA', sku: 'ELE-UPS-032', category: 'Electronics & Hardware', brand: 'Schneider Electric', purchasePrice: 190.00, sellingPrice: 349.00, availableQuantity: 7, minimumStockThreshold: 4, supplierName: 'Pinnacle Component Co.', warehouseLocation: 'Zone C - High Rack 5' },
  { name: 'Cat6 Shielded Industrial Ethernet Cable 1000ft', sku: 'ELE-ETH-033', category: 'Electronics & Hardware', brand: 'Grainger', purchasePrice: 95.00, sellingPrice: 175.00, availableQuantity: 11, minimumStockThreshold: 5, supplierName: 'Pinnacle Component Co.', warehouseLocation: 'Zone C - High Rack 5' },
  { name: 'Heavy Duty 6-Outlet Surge Protector 15ft Cord', sku: 'ELE-SRG-034', category: 'Electronics & Hardware', brand: 'Anker', purchasePrice: 18.50, sellingPrice: 34.99, availableQuantity: 2, minimumStockThreshold: 8, supplierName: 'Prime Hardware Direct', warehouseLocation: 'Zone C - High Rack 2' }, // Low stock
  { name: 'Thermal Imaging Infrared Camera - Industrial', sku: 'ELE-CAM-035', category: 'Electronics & Hardware', brand: 'Fluke', purchasePrice: 420.00, sellingPrice: 799.00, availableQuantity: 4, minimumStockThreshold: 2, supplierName: 'Pinnacle Component Co.', warehouseLocation: 'Zone C - High Rack 2' },

  // Electrical Components
  { name: 'Miniature Circuit Breaker 20A 1-Pole DIN Rail', sku: 'ELC-MCB-040', category: 'Electrical Components', brand: 'Schneider Electric', purchasePrice: 7.20, sellingPrice: 14.50, availableQuantity: 110, minimumStockThreshold: 25, supplierName: 'Pinnacle Component Co.', warehouseLocation: 'Zone C - High Rack 5' },
  { name: 'Industrial Contactor 24VDC Coil 3-Pole 32A', sku: 'ELC-CNT-041', category: 'Electrical Components', brand: 'Schneider Electric', purchasePrice: 28.00, sellingPrice: 55.00, availableQuantity: 22, minimumStockThreshold: 6, supplierName: 'Pinnacle Component Co.', warehouseLocation: 'Zone C - High Rack 5' },
  { name: 'Heat Shrink Tubing Assortment Kit (300 Pcs)', sku: 'ELC-TUB-042', category: 'Electrical Components', brand: 'Grainger', purchasePrice: 11.50, sellingPrice: 22.90, availableQuantity: 58, minimumStockThreshold: 15, supplierName: 'Pinnacle Component Co.', warehouseLocation: 'Zone C - High Rack 5' },
  { name: 'NEMA 4X Waterproof Electrical Enclosure 12x10x6', sku: 'ELC-ENC-043', category: 'Electrical Components', brand: 'Schneider Electric', purchasePrice: 42.00, sellingPrice: 85.00, availableQuantity: 0, minimumStockThreshold: 4, supplierName: 'Pinnacle Component Co.', warehouseLocation: 'Zone C - High Rack 5' }, // Out of stock

  // Automotive Parts
  { name: 'Heavy Duty Hydraulic Bottle Jack 12-Ton', sku: 'AUT-JCK-050', category: 'Automotive Parts', brand: 'Stanley', purchasePrice: 38.00, sellingPrice: 74.99, availableQuantity: 16, minimumStockThreshold: 5, supplierName: 'Prime Hardware Direct', warehouseLocation: 'Zone E - Bulk Staging' },
  { name: 'Universal Synthetic Grease 14oz Cartridge (Pack 10)', sku: 'AUT-GRS-051', category: 'Automotive Parts', brand: 'Grainger', purchasePrice: 35.00, sellingPrice: 68.00, availableQuantity: 29, minimumStockThreshold: 8, supplierName: 'Prime Hardware Direct', warehouseLocation: 'Zone B - Bay 12' },
  { name: 'Heavy Duty 4-Gauge 20-Foot Booster Cables', sku: 'AUT-BST-052', category: 'Automotive Parts', brand: 'Anker', purchasePrice: 22.00, sellingPrice: 45.00, availableQuantity: 3, minimumStockThreshold: 10, supplierName: 'Prime Hardware Direct', warehouseLocation: 'Zone B - Bay 12' }, // Low stock

  // Office & Facilities
  { name: 'Commercial First Aid Cabinet 3-Shelf OSHA Compliant', sku: 'OFF-AID-060', category: 'Office & Facilities', brand: 'Honeywell', purchasePrice: 65.00, sellingPrice: 125.00, availableQuantity: 11, minimumStockThreshold: 3, supplierName: 'Safeguard Equipment Corp', warehouseLocation: 'Zone D - Cold Bay' },
  { name: 'Industrial Push Broom 24-Inch with Brace Handle', sku: 'OFF-BRM-061', category: 'Office & Facilities', brand: 'Grainger', purchasePrice: 18.00, sellingPrice: 36.00, availableQuantity: 24, minimumStockThreshold: 6, supplierName: 'Global Logistics Distribution', warehouseLocation: 'Zone D - Cold Bay' },
  { name: 'Wet Floor Caution Cones 36-Inch (Pack of 3)', sku: 'OFF-CON-062', category: 'Office & Facilities', brand: 'Grainger', purchasePrice: 28.00, sellingPrice: 52.00, availableQuantity: 15, minimumStockThreshold: 5, supplierName: 'Safeguard Equipment Corp', warehouseLocation: 'Zone D - Cold Bay' },

  // Raw Materials
  { name: 'Aluminum Extrusion Profile 2020 T-Slot 1-Meter (4-Pack)', sku: 'RAW-ALU-070', category: 'Raw Materials', brand: 'Grainger', purchasePrice: 24.00, sellingPrice: 49.99, availableQuantity: 45, minimumStockThreshold: 12, supplierName: 'Apex Industrial Supply', warehouseLocation: 'Zone E - Bulk Staging' },
  { name: 'Grade 8 Heavy Hex Bolts 1/2-13 x 2-Inch (Box 50)', sku: 'RAW-BLT-071', category: 'Raw Materials', brand: 'Stanley', purchasePrice: 19.50, sellingPrice: 38.00, availableQuantity: 76, minimumStockThreshold: 20, supplierName: 'Prime Hardware Direct', warehouseLocation: 'Zone B - Bay 4' },
  { name: 'Carbon Steel Sheet 1/8-Inch 24x24 Ground Flat', sku: 'RAW-STL-072', category: 'Raw Materials', brand: 'Grainger', purchasePrice: 38.00, sellingPrice: 72.00, availableQuantity: 14, minimumStockThreshold: 6, supplierName: 'Apex Industrial Supply', warehouseLocation: 'Zone E - Bulk Staging' }
];

const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Clearing existing collections...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await StockMovement.deleteMany({});
    await Notification.deleteMany({});

    console.log('Seeding Users...');
    const adminUser = await User.create({
      name: 'Alex Mercer (Admin)',
      email: 'admin@stocksense.io',
      password: 'Password123!',
      role: 'admin',
      phone: '+1 (555) 019-2834',
      isActive: true
    });

    const operatorUser = await User.create({
      name: 'Jordan Lee (Operator)',
      email: 'operator@stocksense.io',
      password: 'Password123!',
      role: 'operator',
      phone: '+1 (555) 019-8765',
      isActive: true
    });

    console.log('Admin user created: admin@stocksense.io / Password123!');
    console.log('Operator user created: operator@stocksense.io / Password123!');

    console.log('Seeding Curated Products...');
    const createdProducts = [];

    for (const item of curatedProducts) {
      let status = 'IN_STOCK';
      if (item.availableQuantity === 0) status = 'OUT_OF_STOCK';
      else if (item.availableQuantity <= item.minimumStockThreshold) status = 'LOW_STOCK';

      const prod = await Product.create({
        ...item,
        status,
        createdBy: adminUser._id
      });
      createdProducts.push(prod);

      // Initial Stock Movement
      if (item.availableQuantity > 0) {
        await StockMovement.create({
          product: prod._id,
          sku: prod.sku,
          productName: prod.name,
          type: 'STOCK_IN',
          quantityChanged: item.availableQuantity,
          previousQuantity: 0,
          newQuantity: item.availableQuantity,
          reason: 'Initial warehouse intake balance',
          referenceId: 'PO-2026-001',
          updatedBy: adminUser._id
        });
      }

      // Trigger Smart Low-Stock Alerts
      await checkAndTriggerStockAlert(prod);
    }

    // Generate additional realistic items up to 75 total (or customizable)
    console.log('Generating additional realistic catalog items...');
    for (let i = 1; i <= 35; i++) {
      const cat = categories[i % categories.length];
      const brand = brands[i % brands.length];
      const supp = suppliers[i % suppliers.length];
      const zone = warehouseZones[i % warehouseZones.length];
      const cost = parseFloat((10 + (i * 3.7) % 150).toFixed(2));
      const price = parseFloat((cost * 1.65).toFixed(2));
      const threshold = 10;
      
      // Some healthy, some low, some out of stock
      let qty = 20 + (i * 7) % 80;
      if (i % 7 === 0) qty = 0; // out of stock
      else if (i % 4 === 0) qty = Math.floor(Math.random() * 5) + 1; // low stock

      const prefix = cat.slice(0, 3).toUpperCase();
      const sku = `${prefix}-GEN-${String(100 + i).padStart(3, '0')}`;

      let status = 'IN_STOCK';
      if (qty === 0) status = 'OUT_OF_STOCK';
      else if (qty <= threshold) status = 'LOW_STOCK';

      const p = await Product.create({
        name: `${brand} Industrial ${cat.split('&')[0].trim()} Spec Model ${100 + i}`,
        sku,
        description: `High performance warehouse grade ${cat.toLowerCase()} built to strict ISO manufacturing standards.`,
        category: cat,
        brand,
        purchasePrice: cost,
        sellingPrice: price,
        availableQuantity: qty,
        minimumStockThreshold: threshold,
        supplierName: supp,
        warehouseLocation: zone,
        status,
        createdBy: adminUser._id
      });
      createdProducts.push(p);

      if (qty > 0) {
        await StockMovement.create({
          product: p._id,
          sku: p.sku,
          productName: p.name,
          type: 'STOCK_IN',
          quantityChanged: qty,
          previousQuantity: 0,
          newQuantity: qty,
          reason: 'Bulk container receipt intake',
          referenceId: `PO-2026-${String(10 + i).padStart(3, '0')}`,
          updatedBy: adminUser._id
        });
      }

      await checkAndTriggerStockAlert(p);
    }

    console.log(`Total Products Seeded: ${createdProducts.length}`);

    // Seed Sample Orders
    console.log('Seeding Sample Orders & Deductions...');
    const sampleCustomers = [
      { name: 'Apex Manufacturing Co.', email: 'orders@apexmanuf.com', phone: '+1 555-111-2233', address: '100 Industrial Pkwy, Chicago, IL', company: 'Apex Mfg' },
      { name: 'Midwest Distribution Hub', email: 'procure@midwestdist.com', phone: '+1 555-444-5566', address: '450 Logistics Way, Indianapolis, IN', company: 'Midwest Dist' },
      { name: 'Titan Contractors LLC', email: 'billing@titancontractors.com', phone: '+1 555-777-8899', address: '880 Builder Ave, Detroit, MI', company: 'Titan LLC' },
      { name: 'Vanguard Facilities Inc', email: 'supply@vanguardfac.com', phone: '+1 555-222-3344', address: '320 Commerce Blvd, Columbus, OH', company: 'Vanguard' },
      { name: 'Harbor Automation Systems', email: 'parts@harborauto.com', phone: '+1 555-999-0011', address: '12 Dockside Rd, Cleveland, OH', company: 'Harbor Systems' }
    ];

    const statuses = ['COMPLETED', 'PROCESSING', 'PENDING', 'CANCELLED'];

    for (let o = 0; o < 12; o++) {
      const cust = sampleCustomers[o % sampleCustomers.length];
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - (o * 3));

      // Pick 2-4 in-stock products
      const availableProds = createdProducts.filter(p => p.availableQuantity > 5);
      const chosen = availableProds.slice(o * 2, (o * 2) + 2);

      if (chosen.length > 0) {
        let orderTotal = 0;
        const orderItems = chosen.map(prod => {
          const qty = Math.floor(Math.random() * 3) + 1;
          const subtotal = prod.sellingPrice * qty;
          orderTotal += subtotal;
          return {
            product: prod._id,
            sku: prod.sku,
            name: prod.name,
            unitPrice: prod.sellingPrice,
            quantity: qty,
            subtotal
          };
        });

        const status = statuses[o % statuses.length];
        const orderNumber = `ORD-202610${String(10 + o).padStart(2, '0')}-${1000 + o}`;

        const ord = await Order.create({
          orderNumber,
          customer: cust,
          items: orderItems,
          totalAmount: parseFloat(orderTotal.toFixed(2)),
          status,
          paymentStatus: status === 'CANCELLED' ? 'REFUNDED' : 'PAID',
          notes: `Regular scheduled order for ${cust.company}`,
          createdBy: o % 2 === 0 ? adminUser._id : operatorUser._id,
          createdAt: orderDate,
          updatedAt: orderDate
        });

        // Record stock movements for non-cancelled orders
        if (status !== 'CANCELLED') {
          for (const item of orderItems) {
            await StockMovement.create({
              product: item.product,
              sku: item.sku,
              productName: item.name,
              type: 'ORDER_DEDUCTION',
              quantityChanged: -item.quantity,
              previousQuantity: 50,
              newQuantity: 50 - item.quantity,
              reason: `Fulfillment deduction for Order #${orderNumber}`,
              referenceId: orderNumber,
              updatedBy: operatorUser._id,
              createdAt: orderDate
            });
          }
        } else {
          // Cancelled order audit log
          for (const item of orderItems) {
            await StockMovement.create({
              product: item.product,
              sku: item.sku,
              productName: item.name,
              type: 'ORDER_RESTORE',
              quantityChanged: item.quantity,
              previousQuantity: 45,
              newQuantity: 45 + item.quantity,
              reason: `Restoration from cancelled Order #${orderNumber}`,
              referenceId: orderNumber,
              updatedBy: adminUser._id,
              createdAt: orderDate
            });
          }
        }
      }
    }

    console.log('Sample orders seeded successfully!');
    console.log('==============================================');
    console.log('🎉 SEEDING COMPLETE!');
    console.log('Admin login: admin@stocksense.io / Password123!');
    console.log('Operator login: operator@stocksense.io / Password123!');
    console.log('==============================================');

    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
