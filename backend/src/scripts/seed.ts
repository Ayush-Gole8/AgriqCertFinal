import database from '../config/database.config.js';
import { User } from '../models/user.model.js';
import { Batch } from '../models/batch.model.js';
import { Inspection } from '../models/inspection.model.js';
import config from '../config/config.js';

const seedData = async () => {
  try {
    console.log('🌱 Starting database seed...\n');

    // Connect to database
    await database.connect();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Batch.deleteMany({});
    await Inspection.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Create Admin User
    console.log('👤 Creating admin user...');
    const admin = await User.create({
      email: config.admin.email,
      password: config.admin.password,
      name: config.admin.name,
      role: 'admin',
      isActive: true,
      isVerified: true,
    });
    console.log(`✅ Admin created: ${admin.email}\n`);

    // Create Farmers
    console.log('👨‍🌾 Creating farmers...');
    const farmers = await User.create([
      {
        email: 'farmer1@agriqcert.com',
        password: 'Farmer@123',
        name: 'Ram Jadhav',
        role: 'farmer',
        organization: 'Green Valley Farms',
        phone: '+91-9356944782',
        address: 'Jadhav Farms, Pune, Maharashtra, India',
        isActive: true,
        isVerified: true,
      },
      {
        email: 'farmer2@agriqcert.com',
        password: 'Farmer@123',
        name: 'Maruti Patil',
        role: 'farmer',
        organization: 'Sunshine Organic Farm',
        phone: '+91-9876543210',
        address: 'Patil Farm, Nashik, Maharashtra, India',
        isActive: true,
        isVerified: true,
      },
      {
        email: 'farmer3@agriqcert.com',
        password: 'Farmer@123',
        name: 'Damodar Shinde',
        role: 'farmer',
        organization: 'Golden Harvest Co-op',
        phone: '+91-9356944783',
        address: 'Shinde Farm, Satara, Maharashtra, India',
        isActive: true,
        isVerified: true,
      },
    ]);
    console.log(`✅ Created ${farmers.length} farmers\n`);

    // Create QA Inspectors
    console.log('🔍 Creating QA inspectors...');
    const inspectors = await User.create([
      {
        email: 'inspector1@agriqcert.com',
        password: 'Inspector@123',
        name: 'Sanjay Kulkarni',
        role: 'qa_inspector',
        organization: 'AgriQCert Inspection Services',
        phone: '+91-9356944784',
        isActive: true,
        isVerified: true,
      },
      {
        email: 'inspector2@agriqcert.com',
        password: 'Inspector@123',
        name: 'Mohan Patel',
        role: 'qa_inspector',
        organization: 'AgriQCert Inspection Services',
        phone: '+91-9356944785',
        isActive: true,
        isVerified: true,
      },
    ]);
    console.log(`✅ Created ${inspectors.length} QA inspectors\n`);

    // Create Certifiers
    console.log('📜 Creating certifiers...');
    const certifiers = await User.create([
      {
        email: 'certifier1@agriqcert.com',
        password: 'Certifier@123',
        name: 'Dr. Rehana Sheikh',
        role: 'certifier',
        organization: 'AgriQCert Certification Authority',
        phone: '+91-9356944786',
        isActive: true,
        isVerified: true,
      },
    ]);
    console.log(`✅ Created ${certifiers.length} certifiers\n`);

    // Create Verifiers
    console.log('🔍 Creating verifiers...');
    const verifiers = await User.create([
      {
        email: 'verifier1@agriqcert.com',
        password: 'Verifier@123',
        name: 'Harmanpreet Singh',
        role: 'verifier',
        organization: 'AgriQCert Verification Services',
        phone: '+91-9356944787',
        isActive: true,
        isVerified: true,
      },
      {
        email: 'verifier2@agriqcert.com',
        password: 'Verifier@123',
        name: 'Sarah Davis',
        role: 'verifier',
        organization: 'Independent Verification Co.',
        phone: '+91-9356944788',
        isActive: true,
        isVerified: true,
      },
    ]);
    console.log(`✅ Created ${verifiers.length} verifiers\n`);

    // Create Sample Batches
    console.log('📦 Creating sample batches...');
    const batches = await Batch.create([
      {
        farmerId: farmers[0]._id.toString(),
        farmerName: farmers[0].name,
        productType: 'Vegetables',
        productName: 'Organic Tomatoes',
        quantity: 500,
        unit: 'kg',
        harvestDate: new Date('2024-12-01'),
        location: {
          latitude: 36.7783,
          longitude: -119.4179,
          address: '123 Farm Road, Junnar, Pune, Maharashtra, India',
          region: 'Central Valley',
          country: 'India',
        },
        status: 'submitted',
        attachments: [
          {
            id: 'att-001',
            name: 'harvest-photo.jpg',
            type: 'image',
            url: '/uploads/harvest-photo.jpg',
            mimeType: 'image/jpeg',
            size: 245000,
            uploadedAt: new Date(),
          },
        ],
        submittedAt: new Date(),
      },
      {
        farmerId: farmers[1]._id.toString(),
        farmerName: farmers[1].name,
        productType: 'Fruits',
        productName: 'Organic Strawberries',
        quantity: 200,
        unit: 'kg',
        harvestDate: new Date('2024-12-03'),
        location: {
          latitude: 37.3688,
          longitude: -122.0363,
          address: '456 Harvest Lane, Nashik, Maharashtra, India',
          region: 'Ghat',
          country: 'India',
        },
        status: 'submitted',
        attachments: [],
        submittedAt: new Date(),
      },
      {
        farmerId: farmers[2]._id.toString(),
        farmerName: farmers[2].name,
        productType: 'Grains',
        productName: 'Organic Wheat',
        quantity: 2,
        unit: 'tons',
        harvestDate: new Date('2024-11-25'),
        location: {
          latitude: 36.7378,
          longitude: -119.7871,
          address: '789 Grain Blvd, Satara, Maharashtra, India',
          region: 'Central Valley',
          country: 'India',
        },
        status: 'approved',
        attachments: [],
        submittedAt: new Date('2024-11-26'),
        approvedAt: new Date('2024-11-28'),
      },
      {
        farmerId: farmers[0]._id.toString(),
        farmerName: farmers[0].name,
        productType: 'Vegetables',
        productName: 'Organic Bell Peppers',
        quantity: 150,
        unit: 'kg',
        harvestDate: new Date('2024-12-05'),
        location: {
          latitude: 36.7783,
          longitude: -119.4179,
          address: '123 Farm Road, Green Valley, CA 93619',
          region: 'Central Valley',
          country: 'USA',
        },
        status: 'draft',
        attachments: [],
      },
    ]);
    console.log(`✅ Created ${batches.length} sample batches\n`);

    // Create Sample Inspections
    console.log('🔬 Creating sample inspections...');
    const inspections = await Inspection.create([
      {
        batchId: batches[0]._id.toString(),
        inspectorId: inspectors[0]._id.toString(),
        inspectorName: inspectors[0].name,
        status: 'in_progress',
        readings: [
          {
            parameter: 'Pesticide Residue',
            value: 0.02,
            unit: 'mg/kg',
            minThreshold: 0,
            maxThreshold: 0.05,
            passed: true,
          },
          {
            parameter: 'Moisture Content',
            value: 92,
            unit: '%',
            minThreshold: 90,
            maxThreshold: 95,
            passed: true,
          },
          {
            parameter: 'Color Grade',
            value: 'A',
            unit: 'grade',
            passed: true,
          },
        ],
        qualityReadings: {
          appearance: 85,
          texture: 90,
          aroma: 88,
          color: 92,
          overallScore: 89,
          moisturePercent: 12.5,
          pesticidePPM: 0.02,
          temperatureC: 22,
          isOrganic: true,
          physicalNotes: 'Good overall condition with slight surface moisture. No visible defects.',
        },
        geospatialData: {
          latitude: 36.7783,
          longitude: -119.4179,
          accuracy: 5,
          timestamp: new Date(),
          isoCode: 'US',
          region: 'California Central Valley',
        },
        photos: [
          {
            id: 'photo-001',
            filename: 'inspection-photo-1.jpg',
            url: '/uploads/inspection-photo-1.jpg',
            size: 245760,
            mimeType: 'image/jpeg',
            uploadedAt: new Date(),
            description: 'Sample crop photo',
          }
        ],
        notes: 'Products look healthy and meet organic standards.',
        outcome: {
          classification: 'conditional_pass',
          reasoning: 'Initial inspection shows good quality but requires final testing.',
          followUpRequired: true,
          complianceNotes: 'Pending final lab reports.',
        },
      },
      {
        batchId: batches[2]._id.toString(),
        inspectorId: inspectors[1]._id.toString(),
        inspectorName: inspectors[1].name,
        status: 'completed',
        readings: [
          {
            parameter: 'Protein Content',
            value: 13.5,
            unit: '%',
            minThreshold: 12,
            maxThreshold: 15,
            passed: true,
          },
          {
            parameter: 'Moisture Content',
            value: 11,
            unit: '%',
            minThreshold: 0,
            maxThreshold: 13,
            passed: true,
          },
          {
            parameter: 'Foreign Material',
            value: 0.1,
            unit: '%',
            minThreshold: 0,
            maxThreshold: 0.5,
            passed: true,
          },
        ],
        qualityReadings: {
          appearance: 95,
          texture: 98,
          aroma: 92,
          color: 96,
          overallScore: 95,
          moisturePercent: 10.8,
          pesticidePPM: 0.001,
          temperatureC: 20,
          isOrganic: true,
          physicalNotes: 'Excellent condition throughout. Premium grade quality with optimal moisture content.',
        },
        geospatialData: {
          latitude: 36.7378,
          longitude: -119.7871,
          accuracy: 8,
          timestamp: new Date('2024-11-27'),
          isoCode: 'US',
          region: 'California Central Valley',
        },
        photos: [
          {
            id: 'photo-002',
            filename: 'inspection-photo-2.jpg',
            url: '/uploads/inspection-photo-2.jpg',
            size: 312480,
            mimeType: 'image/jpeg',
            uploadedAt: new Date('2024-11-27'),
            description: 'Final quality assessment photo',
          }
        ],
        notes: 'Excellent quality wheat. All parameters within acceptable range.',
        outcome: {
          classification: 'pass',
          reasoning: 'All quality metrics exceed requirements. Product ready for certification.',
          followUpRequired: false,
          complianceNotes: 'Meets all organic certification standards.',
        },
        completedAt: new Date('2024-11-27'),
      },
    ]);
    console.log(`✅ Created ${inspections.length} sample inspections\n`);

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('✅ Database seeding completed!\n');
    console.log('📊 Summary:');
    console.log(`   • Admin: 1`);
    console.log(`   • Farmers: ${farmers.length}`);
    console.log(`   • QA Inspectors: ${inspectors.length}`);
    console.log(`   • Certifiers: ${certifiers.length}`);
    console.log(`   • Batches: ${batches.length}`);
    console.log(`   • Inspections: ${inspections.length}\n`);

    console.log('🔐 Login Credentials:\n');
    console.log('Admin:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${config.admin.password}\n`);

    console.log('Sample Farmer:');
    console.log(`   Email: ${farmers[0].email}`);
    console.log(`   Password: Farmer@123\n`);

    console.log('Sample Inspector:');
    console.log(`   Email: ${inspectors[0].email}`);
    console.log(`   Password: Inspector@123\n`);

    console.log('Sample Certifier:');
    console.log(`   Email: ${certifiers[0].email}`);
    console.log(`   Password: Certifier@123\n`);

    console.log('═══════════════════════════════════════\n');

    await database.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await database.disconnect();
    process.exit(1);
  }
};

// Run seed
seedData();
