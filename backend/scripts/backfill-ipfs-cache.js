/* One-off backfill: fetches every IPFS-pinned document that has no cached copy yet
(IpfsDocument.fileData IS NULL — see the proxyDocument comment in controllers/ipfs.js for why
this cache exists) directly from IPFS and stores it in Postgres. Without this, an
already-imported contract only gets cached lazily on its own next individual view (still one
gateway round-trip needed at that point); this rapatrie every one of them in a single pass so
none of them depend on the gateway being reachable at all going forward.

For a document belonging to a contract flagged isExternalPdf, the fetched bytes are verified
against that contract's certified sha256Hash BEFORE being cached — a mismatch is reported and
left uncached rather than silently trusted, since IPFS + that hash remain the actual source of
truth, never the local cache.

Run: node scripts/backfill-ipfs-cache.js [--dry-run]
  --dry-run   Report what would happen without writing anything to the database.
*/

const dotenv = require('dotenv');
dotenv.config();

const crypto = require('crypto');
const prisma = require('../models/prisma');
const ipfsService = require('../services/ipfs');

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const documents = await prisma.ipfsDocument.findMany({ where: { fileData: null } });
  console.log(`${documents.length} document(s) sans copie en cache trouve(s).${dryRun ? ' (dry-run : rien ne sera ecrit)' : ''}\n`);

  let cached = 0;
  let mismatched = 0;
  let failed = 0;

  for (const doc of documents) {
    const label = `${doc.cid} (${doc.fileName})`;
    try {
      // A document isn't necessarily still attached to a contract (could be orphaned, or
      // predate ContractCache linking cleanly by ipfsHash) — findFirst rather than a required
      // join, and no certified hash to check against when there's no match.
      const contract = await prisma.contractCache.findFirst({ where: { ipfsHash: doc.cid } });
      const expectedHash = contract?.metadata?.isExternalPdf ? contract.metadata?.sha256Hash : null;

      const upstream = await fetch(ipfsService.getPublicUrl(doc.cid));
      if (!upstream.ok) {
        console.error(`  [ECHEC] ${label} — HTTP ${upstream.status}`);
        failed++;
        continue;
      }
      const buffer = Buffer.from(await upstream.arrayBuffer());

      if (expectedHash) {
        const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');
        if (actualHash !== expectedHash) {
          console.error(`  [ECART DE HASH] ${label} — attendu ${expectedHash}, obtenu ${actualHash} — NON mis en cache, verification manuelle requise`);
          mismatched++;
          continue;
        }
      }

      if (!dryRun) {
        await prisma.ipfsDocument.update({ where: { cid: doc.cid }, data: { fileData: buffer } });
      }
      console.log(`  [OK] ${label} — ${buffer.length} octets`);
      cached++;
    } catch (err) {
      console.error(`  [ERREUR] ${label} —`, err.message);
      failed++;
    }
  }

  console.log(`\nTermine : ${cached} mis en cache, ${mismatched} ecart(s) de hash, ${failed} echec(s) sur ${documents.length} document(s).`);
  if (mismatched > 0) {
    console.log("Les contrats en ecart de hash n'ont pas ete mis en cache — ils continueront a passer par la gateway a chaque vue tant que l'ecart n'est pas elucide.");
  }
}

main()
  .catch((err) => {
    console.error('Erreur fatale du backfill:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
