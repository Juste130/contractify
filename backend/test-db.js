const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$connect();
        console.log('Connexion reussie !');
        await prisma.$disconnect();
    } catch (e) {
        console.error('Erreur:', e);
    }
}
main();
