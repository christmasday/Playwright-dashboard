const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.example' });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/playwright_dashboard_test';

async function migrate() {
  try {
    const client = new MongoClient(uri);

    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();

    // Drop existing collection if it exists
    await db.collection('testruns').drop().catch(() => {
      // Collection doesn't exist, that's fine
    });

    // Create collection with schema
    await db.createCollection('testruns', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['title', 'status', 'duration', 'createdAt'],
          properties: {
            id: { bsonType: 'string' },
            title: { bsonType: 'string' },
            status: {
              bsonType: 'string',
              enum: ['pending', 'running', 'passed', 'failed', 'skipped', 'quarantined']
            },
            duration: { bsonType: 'number' },
            retries: { bsonType: 'int', minimum: 0 },
            flakinessScore: { bsonType: 'number', minimum: 0, maximum: 1 },
            tags: { bsonType: 'array', items: { bsonType: 'string' } },
            steps: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['step', 'status'],
                properties: {
                  step: { bsonType: 'string' },
                  status: {
                    bsonType: 'string',
                    enum: ['passed', 'failed', 'skipped']
                  },
                  duration: { bsonType: 'number' }
                }
              }
            },
            artifacts: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['type', 'url'],
                properties: {
                  type: {
                    bsonType: 'string',
                    enum: ['screenshot', 'video', 'trace', 'log', 'console']
                  },
                  url: { bsonType: 'string' },
                  name: { bsonType: 'string' },
                  size: { bsonType: 'number' }
                }
              }
            },
            terminalOutput: { bsonType: 'string' },
            errorMessage: { bsonType: 'string' },
            stackTrace: { bsonType: 'string' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
            quarantineReason: { bsonType: 'string' },
            quarantineExpiresAt: { bsonType: 'date' }
          }
        }
      }
    });

    // Create indexes
    await db.collection('testruns').createIndex({ status: 1 });
    await db.collection('testruns').createIndex({ title: 1 });
    await db.collection('testruns').createIndex({ createdAt: -1 });
    await db.collection('testruns').createIndex({ tags: 1 });
    await db.collection('testruns').createIndex({ flakinessScore: -1 });
    await db.collection('testruns').createIndex({ status: 1, createdAt: -1 });

    console.log('✅ Migration completed successfully');
    console.log('   - Created testruns collection with schema');
    console.log('   - Added indexes for common queries');

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
