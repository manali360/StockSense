const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getUsers);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['admin', 'operator']).withMessage('Role must be admin or operator')
  ],
  validate,
  createUser
);

router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
