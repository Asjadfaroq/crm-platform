const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const auth = require('../middleware/auth');
const workspaceGuard = require('../middleware/workspaceGuard');

router.use(auth);
router.use(workspaceGuard);

// GET /api/logs - All logs (workspace members)
router.get('/', logController.getAllLogs);

// GET /api/logs/lead/:id - Logs for a specific lead (all members)
router.get('/lead/:id', logController.getLogsByLead);

module.exports = router;
