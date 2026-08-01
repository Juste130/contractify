const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { config } = require('../config');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async sendEmail(to, subject, html, text) {
    try {
      await this.transporter.sendMail({
        from: config.emailFrom,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      });

      logger.info(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      logger.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendWelcomeEmail(to, name) {
    const subject = 'Bienvenue sur Contractify';
    const html = `
      <h1>Bienvenue ${name} !</h1>
      <p>Merci de vous être inscrit sur Contractify.</p>
      <p>Vous pouvez maintenant créer et gérer vos contrats de manière sécurisée sur la blockchain.</p>
      <p>Votre wallet a été créé automatiquement et financé avec un peu de MATIC pour vos premières transactions.</p>
      <p>Cordialement,<br>L'équipe Contractify</p>
    `;

    await this.sendEmail(to, subject, html);
  }

  async sendDraftInvitationEmail(to, name, contractTitle, draftId) {
    const subject = `Vous êtes invité(e) à signer un contrat : ${contractTitle}`;
    const signupUrl = `${config.frontendUrl}/signup?redirect=/contract-details?id=${draftId}`;
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f1a; color: #e0e0e0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 40px 30px; text-align: center;">
          <h1 style="color: #FFC107; font-size: 28px; margin: 0 0 8px;">ContracTify</h1>
          <p style="color: #888; margin: 0; font-size: 14px;">Contrats intelligents sur blockchain</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 16px;">Bonjour ${name},</h2>
          <p style="color: #aaa; line-height: 1.7; margin-bottom: 20px;">
            Vous avez été invité(e) à signer le contrat suivant sur la plateforme ContracTify :
          </p>
          <div style="background: #1a1a2e; border: 1px solid #FFC10730; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
            <p style="color: #FFC107; font-weight: bold; font-size: 16px; margin: 0;">${contractTitle}</p>
            <p style="color: #666; font-size: 12px; margin: 8px 0 0; font-family: monospace;">Réf: ${draftId.slice(0, 8)}...</p>
          </div>
          <p style="color: #aaa; line-height: 1.7; margin-bottom: 28px;">
            Pour signer ce contrat, vous devez d'abord créer un compte gratuit sur ContracTify. 
            Un portefeuille numérique sécurisé vous sera automatiquement attribué.
          </p>
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${signupUrl}" 
               style="background: #FFC107; color: #212121; padding: 14px 32px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: bold; font-size: 15px;">
              Créer mon compte et signer
            </a>
          </div>
          <p style="color: #555; font-size: 12px; text-align: center; border-top: 1px solid #222; padding-top: 20px; margin: 0;">
            Votre signature aura valeur légale, conforme à la réglementation eIDAS.<br>
            Si vous n'attendiez pas cet email, vous pouvez l'ignorer.
          </p>
        </div>
      </div>
    `;
    await this.sendEmail(to, subject, html);
  }

  async sendSignatureRequest(to, contractTitle, contractId, signerName) {
    const subject = `Signature requise: ${contractTitle}`;
    const html = `
      <h1>Signature de contrat requise</h1>
      <p>Bonjour ${signerName},</p>
      <p>Vous êtes invité(e) à signer le contrat suivant:</p>
      <h2>${contractTitle}</h2>
      <p>ID du contrat: #${contractId}</p>
      <p>
        <a href="${config.frontendUrl}/contract-details?id=${contractId}" 
           style="background-color: #FFC107; color: #212121; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Voir et signer le contrat
        </a>
      </p>
      <p>Cordialement,<br>L'équipe Contractify</p>
    `;

    await this.sendEmail(to, subject, html);
  }

  async sendContractFinalizedEmail(to, contractTitle, contractId, nftTokenId) {
    const subject = `Contrat finalisé: ${contractTitle}`;
    const html = `
      <h1>Contrat finalisé avec succès</h1>
      <p>Le contrat suivant a été finalisé et enregistré sur la blockchain:</p>
      <h2>${contractTitle}</h2>
      <p>ID du contrat: #${contractId}</p>
      <p>NFT Token ID: #${nftTokenId}</p>
      <p>Toutes les signatures ont été collectées et le contrat est maintenant actif.</p>
      <p>
        <a href="${config.frontendUrl}/contract-details?id=${contractId}" 
           style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Voir le contrat
        </a>
      </p>
      <p>Cordialement,<br>L'équipe Contractify</p>
    `;

    await this.sendEmail(to, subject, html);
  }

  async sendPasswordResetEmail(to, resetToken) {
    const subject = 'Réinitialisation de mot de passe';
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
    const html = `
      <h1>Réinitialisation de mot de passe</h1>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe:</p>
      <p>
        <a href="${resetUrl}" 
           style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Réinitialiser mon mot de passe
        </a>
      </p>
      <p>Ce lien expirera dans 1 heure.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      <p>Cordialement,<br>L'équipe Contractify</p>
    `;

    await this.sendEmail(to, subject, html);
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

module.exports = new EmailService();
