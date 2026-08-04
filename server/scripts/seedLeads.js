require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Lead = require('../src/models/Lead');
const Workspace = require('../src/models/Workspace');

const TOTAL_LEADS = 50000;
const BATCH_SIZE = 1000;

const firstNames = [
    'Ali', 'Ahmed', 'Muhammad', 'Omar', 'Hassan', 'Ibrahim', 'Zaid', 'Bilal',
    'Sara', 'Fatima', 'Aisha', 'Maryam', 'Noor', 'Hana', 'Zara', 'Layla',
    'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
    'Emily', 'Emma', 'Olivia', 'Sophia', 'Isabella', 'Ava', 'Mia', 'Charlotte',
    'Liam', 'Noah', 'Ethan', 'Mason', 'Logan', 'Lucas', 'Oliver', 'Aiden',
];

const lastNames = [
    'Khan', 'Ahmed', 'Ali', 'Sheikh', 'Malik', 'Qureshi', 'Siddiqui', 'Ansari',
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris',
    'Martin', 'Thompson', 'Young', 'Robinson', 'Lewis', 'Walker', 'Hall', 'Allen',
];

const statuses = ['New', 'Contacted', 'In Progress', 'Closed', 'Rejected'];
const priorities = ['Low', 'Medium', 'High', 'Urgent'];
const dipAccounts = ['pending', 'created'];

const sourceDomains = [
    'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com',
    'google.com', 'youtube.com', 'tiktok.com', 'website.com',
];

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPhone() {
    return `+92${randomInt(300, 349)}${randomInt(1000000, 9999999)}`;
}

function randomAmount() {
    return String(randomInt(5000, 5000000));
}

function randomName() {
    return `${randomItem(firstNames)} ${randomItem(lastNames)}`;
}

function randomSourceLink() {
    if (Math.random() < 0.3) return '';
    return `https://www.${randomItem(sourceDomains)}/campaign/${randomInt(100, 999)}`;
}

function randomDate(daysBack = 365) {
    const d = new Date();
    d.setDate(d.getDate() - randomInt(0, daysBack));
    return d;
}

function generateBatch(workspaceId, batchIndex, batchSize) {
    const leads = [];
    for (let i = 0; i < batchSize; i++) {
        const seq = batchIndex * batchSize + i + 1;
        leads.push({
            workspace: workspaceId,
            leadId: `LEAD-${String(seq).padStart(6, '0')}`,
            name: randomName(),
            mobile: randomPhone(),
            amount: randomAmount(),
            sourceLink: randomSourceLink(),
            status: randomItem(statuses),
            priority: randomItem(priorities),
            assignedTo: null,
            next_followup: Math.random() < 0.4 ? randomDate(30) : null,
            dip_account: randomItem(dipAccounts),
            notes: [],
            createdAt: randomDate(365),
        });
    }
    return leads;
}

const seedLeads = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find first workspace to attach leads to
        const workspace = await Workspace.findOne();
        if (!workspace) {
            console.error('No workspace found. Please create a workspace first.');
            process.exit(1);
        }
        console.log(`Using workspace: "${workspace.name}" (${workspace._id})`);

        const totalBatches = Math.ceil(TOTAL_LEADS / BATCH_SIZE);
        let inserted = 0;

        console.log(`Seeding ${TOTAL_LEADS} leads in ${totalBatches} batches of ${BATCH_SIZE}...`);

        for (let b = 0; b < totalBatches; b++) {
            const batchSize = Math.min(BATCH_SIZE, TOTAL_LEADS - inserted);
            const batch = generateBatch(workspace._id, b, batchSize);
            await Lead.insertMany(batch, { ordered: false });
            inserted += batchSize;
            process.stdout.write(`\rProgress: ${inserted}/${TOTAL_LEADS} leads inserted`);
        }

        console.log(`\nDone! ${inserted} leads added to workspace "${workspace.name}".`);
        process.exit(0);
    } catch (error) {
        console.error('\nSeed failed:', error.message);
        process.exit(1);
    }
};

seedLeads();
