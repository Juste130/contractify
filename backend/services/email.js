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
    const safeName = this.escapeHtml(name || '');
    const safeTitle = this.escapeHtml(contractTitle || '');
    const subject = `Vous êtes invité(e) à signer un contrat : ${safeTitle}`;
    const signupUrl = `${config.frontendUrl}/signup?redirect=/contract-details?id=${draftId}`;
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f1a; color: #e0e0e0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 40px 30px; text-align: center;">
          <h1 style="color: #FFC107; font-size: 28px; margin: 0 0 8px;">ContracTify</h1>
          <p style="color: #888; margin: 0; font-size: 14px;">Contrats intelligents sur blockchain</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 16px;">Bonjour ${safeName},</h2>
          <p style="color: #aaa; line-height: 1.7; margin-bottom: 20px;">
            Vous avez été invité(e) à signer le contrat suivant sur la plateforme ContracTify :
          </p>
          <div style="background: #1a1a2e; border: 1px solid #FFC10730; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
            <p style="color: #FFC107; font-weight: bold; font-size: 16px; margin: 0;">${safeTitle}</p>
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
            Votre signature aura valeur légale, conformément à la loi applicable à ce contrat.<br>
            Si vous n'attendiez pas cet email, vous pouvez l'ignorer.
          </p>
        </div>
      </div>
    `;
    await this.sendEmail(to, subject, html);
  }

  async sendSignatureRequest(to, contractTitle, contractId, signerName) {
    const safeName = this.escapeHtml(signerName || '');
    const safeTitle = this.escapeHtml(contractTitle || '');
    const subject = `Signature requise: ${safeTitle}`;
    const html = `
      <h1>Signature de contrat requise</h1>
      <p>Bonjour ${safeName},</p>
      <p>Vous êtes invité(e) à signer le contrat suivant:</p>
      <h2>${safeTitle}</h2>
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

  async sendContractFinalizedNotification(to, contractTitle, contractId) {
    const safeTitle = this.escapeHtml(contractTitle || '');
    const subject = `Félicitations ! Le contrat "${safeTitle}" est maintenant actif`;
    const html = `
      <h1>Votre contrat est actif !</h1>
      <p>Bonjour,</p>
      <p>Toutes les signatures ont été collectées. Le contrat suivant est maintenant actif sur la blockchain :</p>
      <h2>${safeTitle}</h2>
      <p>ID du contrat : #${contractId}</p>
      <p>Un NFT de preuve a été généré avec succès.</p>
      <p>
        <a href="${config.frontendUrl}/contract-details?id=${contractId}" 
           style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
          Consulter le contrat actif
        </a>
      </p>
      <p>Cordialement,<br>L'équipe Contractify</p>
    `;
    await this.sendEmail(to, subject, html);
  }

  async sendContractStatusNotification(to, contractTitle, contractId, newStatus) {
    const safeTitle = this.escapeHtml(contractTitle || '');
    const subject = `Mise à jour du contrat : "${safeTitle}" est ${newStatus}`;
    const html = `
      <h1>Statut du contrat mis à jour</h1>
      <p>Bonjour,</p>
      <p>Le contrat suivant a changé de statut :</p>
      <h2>${safeTitle}</h2>
      <p>ID du contrat : #${contractId}</p>
      <p>Nouveau statut : <strong>${newStatus}</strong></p>
      <p>
        <a href="${config.frontendUrl}/contract-details?id=${contractId}" 
           style="background-color: #FFC107; color: #212121; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
          Consulter les détails du contrat
        </a>
      </p>
      <p>Cordialement,<br>L'équipe Contractify</p>
    `;
    await this.sendEmail(to, subject, html);
  }

  async sendGenericNotification(to, title, message, contractCacheId) {
    const safeTitle = this.escapeHtml(title || '');
    const safeMessage = this.escapeHtml(message || '');
    const html = `
      <h1>${safeTitle}</h1>
      <p>${safeMessage}</p>
      ${contractCacheId ? `
      <p>
        <a href="${config.frontendUrl}/contract-details?id=${contractCacheId}"
           style="background-color: #FFC107; color: #212121; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
          Voir le contrat
        </a>
      </p>` : ''}
      <p>Cordialement,<br>L'équipe Contractify</p>
    `;
    await this.sendEmail(to, safeTitle, html);
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

module.exports = new EmailService();
