const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const workspaceGuard = require('../middleware/workspaceGuard');
const validate = require('../middleware/validate');
const { changeRoleSchema } = require('../validators/authValidator');

router.use(auth);
router.use(workspaceGuard);

// GET /api/users — list workspace members (workspace members)
router.get('/', userController.getUsers);

// PATCH /api/users/:id/toggle — activate/deactivate user (workspace admin)
router.patch('/:id/toggle', userController.toggleUserActive);

// PATCH /api/users/:id/role — change user role (workspace admin)
router.patch('/:id/role', validate(changeRoleSchema), userController.changeUserRole);

module.exports = router;
