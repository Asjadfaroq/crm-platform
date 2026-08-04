const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log('SQL Server connected via Prisma');
    } catch (error) {
        console.error('DB connection error:', error.message);
        process.exit(1);
    }
};

module.exports = { prisma, connectDB };
