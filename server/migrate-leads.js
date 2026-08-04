/**
 * Migration: Assign all unscoped leads to the "abc" workspace.
 *
 * If no workspace named "abc" exists, it will be created using the
 * first admin user found.  Run with:
 *   node migrate-leads.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');

// Inline model references (avoid circular imports)
const Workspace = require('./src/models/Workspace');
const User = require('./src/models/User');
const Lead = require('./src/models/Lead');

async function run() {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // ------------------------------------------------------------------
    // 1. Find or create the "abc" workspace
    // ------------------------------------------------------------------
    let workspace = await Workspace.findOne({ name: 'abc' });

    if (!workspace) {
        console.log('ℹ️  No workspace named "abc" found — creating one…');

        // Pick the first user in the DB to be the owner
        const owner = await User.findOne({}).sort({ createdAt: 1 });
        if (!owner) {
            console.error('❌ No users found in the database. Create a user first.');
            process.exit(1);
        }

        workspace = await Workspace.create({
            name: 'abc',
            owner: owner._id,
            members: [{ user: owner._id, role: 'admin' }],
        });

        console.log(`✅ Workspace "abc" created (id: ${workspace._id}), owner: ${owner.email}`);
    } else {
        console.log(`✅ Found existing workspace "abc" (id: ${workspace._id})`);
    }

    // ------------------------------------------------------------------
    // 2. Find all leads that have no workspace field
    // ------------------------------------------------------------------
    const orphaned = await Lead.find({ workspace: { $exists: false } });
    console.log(`📋 Found ${orphaned.length} lead(s) without a workspace`);

    if (orphaned.length === 0) {
        console.log('Nothing to migrate.');
        process.exit(0);
    }

    // ------------------------------------------------------------------
    // 3. Assign them all to "abc", regenerating per-workspace leadIds
    // ------------------------------------------------------------------
    let counter = await Lead.countDocuments({ workspace: workspace._id });

    for (const lead of orphaned) {
        counter++;
        const newLeadId = `LD${String(counter).padStart(4, '0')}`;
        await Lead.updateOne(
            { _id: lead._id },
            { $set: { workspace: workspace._id, leadId: newLeadId } }
        );
        console.log(`  ✔ ${lead.name} → workspace "abc" (${newLeadId})`);
    }

    console.log(`\n🎉 Migration complete! ${orphaned.length} lead(s) assigned to workspace "abc".`);
    process.exit(0);
}

run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
