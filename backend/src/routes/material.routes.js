const express = require('express');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { createMaterialSchema, queryMaterialsSchema } = require('../validators/material.validator');
const materialController = require('../controllers/material.controller');

const router = express.Router();

router.use(authenticate);

// Multipart Upload & Pipeline Processing Endpoint
router.post('/upload', upload.single('file'), materialController.uploadAndProcess);

// Standard JSON Endpoints
router.post('/', validate(createMaterialSchema), materialController.create);
router.get('/', validate(queryMaterialsSchema, 'query'), materialController.getAll);
router.get('/:id', materialController.getById);
router.delete('/:id', materialController.deleteById);

module.exports = router;
