const { PinataSDK } = require('pinata-web3');
const prisma = require('../models/prisma');
const logger = require('../utils/logger');
const { config } = require('../config');

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

            await prisma.ipfsDocument.create({
                data: {
                    cid,
                    fileName,
                    fileSize: fileBuffer.length,
                    mimeType,
                    uploadedBy,
                },
            });

            logger.info(`Document uploaded to IPFS: ${cid}`);

            return { cid, url };
        } catch (error) {
            logger.error('Error uploading to IPFS:', error);
            throw new Error('Failed to upload document to IPFS');
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
            throw new Error('Failed to upload JSON to IPFS');
        }
    }

    async getDocumentMetadata(cid) {
        try {
            const document = await prisma.ipfsDocument.findUnique({
                where: { cid },
            });

            if (!document) {
                throw new Error('Document not found');
            }

            return document;
        } catch (error) {
            logger.error('Error getting document metadata:', error);
            throw new Error('Failed to get document metadata');
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
            throw new Error('Failed to unpin document');
        }
    }

    getPublicUrl(cid) {
        return `${config.pinataGateway}/ipfs/${cid}`;
    }

    async listPinnedFiles() {
        try {
            const files = await this.pinata.listFiles();
            return files;
        } catch (error) {
            logger.error('Error listing pinned files:', error);
            throw new Error('Failed to list pinned files');
        }
    }
}

module.exports = new IPFSService();
