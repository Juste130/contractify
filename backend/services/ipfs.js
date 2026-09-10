const { PinataSDK } = require('pinata-web3');
const prisma = require('../models/prisma');
const logger = require('../utils/logger');
const { config } = require('../config');
const { AppError, NotFoundError } = require('../utils/errors');

class IPFSService {
    constructor() {
        this.pinata = new PinataSDK({
            pinataJwt: config.pinataJwt,
            pinataGateway: config.pinataGateway,
        });
    }

    async uploadDocument(fileBuffer, fileName, mimeType, uploadedBy) {
        try {
            const file = new File([fileBuffer], fileName, { type: mimeType });

            const upload = await this.pinata.upload.file(file);

            const cid = upload.IpfsHash;
            const url = `${config.pinataGateway}/ipfs/${cid}`;

            // upsert, not create: a CID is a hash of the content, so re-uploading the exact
            // same file (a retry after a later step failed, a double-click...) legitimately
            // produces the same CID Pinata already has pinned — that must be a no-op, not a
            // unique-constraint crash on a document that's already correctly stored.
            await prisma.ipfsDocument.upsert({
                where: { cid },
                create: {
                    cid,
                    fileName,
                    fileSize: fileBuffer.length,
                    mimeType,
                    uploadedBy,
                    // A verified local cache of these exact bytes (see the model comment in
                    // schema.prisma) — lets the app serve this document from its own database
                    // afterward instead of depending on the IPFS gateway's cooperation for
                    // every view. Never updated after this insert.
                    fileData: fileBuffer,
                },
                update: {},
            });

            logger.info(`Document uploaded to IPFS: ${cid}`);

            return { cid, url };
        } catch (error) {
            logger.error('Error uploading to IPFS:', error);
            throw new AppError('Failed to upload document to IPFS', 500);
        }
    }

    async uploadJSON(data, name, uploadedBy) {
        try {
            const upload = await this.pinata.upload.json(data);

            const cid = upload.IpfsHash;
            const url = `${config.pinataGateway}/ipfs/${cid}`;

            await prisma.ipfsDocument.create({
                data: {
                    cid,
                    fileName: `${name}.json`,
                    fileSize: JSON.stringify(data).length,
                    mimeType: 'application/json',
                    uploadedBy,
                },
            });

            logger.info(`JSON uploaded to IPFS: ${cid}`);

            return { cid, url };
        } catch (error) {
            logger.error('Error uploading JSON to IPFS:', error);
            throw new AppError('Failed to upload JSON to IPFS', 500);
        }
    }

    async getDocumentMetadata(cid) {
        try {
            const document = await prisma.ipfsDocument.findUnique({
                where: { cid },
            });

            if (!document) {
                throw new NotFoundError('Document not found');
            }

            return document;
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            logger.error('Error getting document metadata:', error);
            throw new AppError('Failed to get document metadata', 500);
        }
    }

    async unpinDocument(cid) {
        try {
            await this.pinata.unpin([cid]);

            await prisma.ipfsDocument.delete({
                where: { cid },
            });

            logger.info(`Document unpinned from IPFS: ${cid}`);
        } catch (error) {
            logger.error('Error unpinning document:', error);
            throw new AppError('Failed to unpin document', 500);
        }
    }

    getPublicUrl(cid) {
        return `${config.pinataGateway}/ipfs/${cid}`;
    }


}

module.exports = new IPFSService();
