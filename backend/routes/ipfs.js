const express = require('express');
const router = express.Router();
const multer = require('multer');
const ipfsController = require('../controllers/ipfs');
const { authenticate } = require('../middleware/auth');

// Configure multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

/**
 * @route   POST /api/ipfs/upload
 * @desc    Upload document to IPFS
 * @access  Private
 */
router.post('/upload', authenticate, upload.single('file'), ipfsController.uploadDocument);

/**
 * @route   POST /api/ipfs/upload-json
 * @desc    Upload JSON to IPFS
 * @access  Private
 */
router.post('/upload-json', authenticate, ipfsController.uploadJSON);

/**
 * @route   GET /api/ipfs/:cid
 * @desc    Get document metadata
 * @access  Private
 */
router.get('/:cid', authenticate, ipfsController.getDocumentMetadata);

/**
 * @route   DELETE /api/ipfs/:cid
 * @desc    Unpin document from IPFS
 * @access  Private
 */
router.delete('/:cid', authenticate, ipfsController.unpinDocument);

module.exports = router;
