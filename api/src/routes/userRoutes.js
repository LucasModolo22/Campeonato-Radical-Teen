const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');

router.get('/user', userController.userAccounts)

router.post('/cadastro', userController.signin);
router.post('/login', userController.login);
router.post('/user/change-password', userController.changePassword);
router.post('/user/info', userController.userInfo)

router.put('/user/account', userController.saveAccount);

module.exports = router;