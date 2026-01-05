const ipfsService = require('../services/ipfs');
const logger = require('../utils/logger');

/**
 * Upload document to IPFS
 */
exports.uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const { originalname, mimetype, buffer } = req.file;
        const uploadedBy = req.user.userId;

        const result = await ipfsService.uploadDocument(
            buffer,
            originalname,
            mimetype,
            uploadedBy
        );

        res.json({
            message: 'Document uploaded successfully',
            cid: result.cid,
            url: result.url,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Upload JSON to IPFS
 */
exports.uploadJSON = async (req, res, next) => {
    try {
        const { data, name } = req.body;

        if (!data || !name) {
            return res.status(400).json({ error: 'Data and name are required' });
        }

        const uploadedBy = req.user.userId;

        const result = await ipfsService.uploadJSON(data, name, uploadedBy);

        res.json({
            message: 'JSON uploaded successfully',
            cid: result.cid,
            url: result.url,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get document metadata
 */
exports.getDocumentMetadata = async (req, res, next) => {
    try {
        const { cid } = req.params;

        const metadata = await ipfsService.getDocumentMetadata(cid);

        res.json({
            metadata,
            url: ipfsService.getPublicUrl(cid),
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Unpin document (delete)
 */
exports.unpinDocument = async (req, res, next) => {
    try {
        const { cid } = req.params;

        await ipfsService.unpinDocument(cid);

        res.json({
            message: 'Document unpinned successfully',
            cid,
        });
    } catch (error) {
        next(error);
    }
};
