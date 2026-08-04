const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];

        // Verify access token (1h, JWT_SECRET). Throws if expired or invalid.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'User not found or deactivated' });
        }

        // Attach both id and _id so controllers work with either
        req.user = { ...user, _id: user.id };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = auth;
