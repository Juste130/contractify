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

  /**
   * Every outgoing email shares this one branded shell (same dark/gold ContracTify header,
   * same card treatment for a contract title, same call-to-action button, same footer) so
   * an invitation, a signature request, and a status update all read as coming from the
   * same product instead of a patchwork of ad-hoc HTML fragments.
   */
  _wrapEmail({ heading, bodyHtml, contractTitle, ctaLabel, ctaUrl, ctaColor = '#FFC107', ctaTextColor = '#212121', footerNote }) {
    return `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f1a; color: #e0e0e0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 40px 30px; text-align: center;">
          <h1 style="color: #FFC107; font-size: 28px; margin: 0 0 8px;">ContracTify</h1>
          <p style="color: #888; margin: 0; font-size: 14px;">Contrats intelligents sur blockchain</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 16px;">${heading}</h2>
          ${bodyHtml}
          ${contractTitle ? `
          <div style="background: #1a1a2e; border: 1px solid #FFC10730; border-radius: 12px; padding: 20px; margin: 8px 0 28px;">
            <p style="color: #FFC107; font-weight: bold; font-size: 16px; margin: 0;">${contractTitle}</p>
          </div>` : ''}
          ${ctaUrl ? `
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${ctaUrl}"
               style="background: ${ctaColor}; color: ${ctaTextColor}; padding: 14px 32px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: bold; font-size: 15px;">
              ${ctaLabel}
            </a>
          </div>` : ''}
          <p style="color: #555; font-size: 12px; text-align: center; border-top: 1px solid #222; padding-top: 20px; margin: 0;">
            ${footerNote || "Cet email a été envoyé automatiquement par ContracTify — si vous n'attendiez pas ce message, vous pouvez l'ignorer."}
          </p>
        </div>
      </div>
    `;
  }

  async sendWelcomeEmail(to, name) {
    const safeName = this.escapeHtml(name || '');
    const subject = 'Bienvenue sur ContracTify';
    const html = this._wrapEmail({
      heading: `Bienvenue ${safeName} !`,
      bodyHtml: `
        <p style="color: #aaa; line-height: 1.7; margin-bottom: 16px;">Merci de vous être inscrit(e) sur ContracTify.</p>
        <p style="color: #aaa; line-height: 1.7; margin-bottom: 16px;">Vous pouvez maintenant créer et gérer vos contrats de manière sécurisée sur la blockchain.</p>
        <p style="color: #aaa; line-height: 1.7; margin-bottom: 28px;">Votre portefeuille numérique a été créé automatiquement et financé avec un peu de MATIC pour vos premières transactions.</p>
      `,
    });

    await this.sendEmail(to, subject, html);
  }

  async sendDraftInvitationEmail(to, name, contractTitle, draftId) {
    const safeName = this.escapeHtml(name || '');
    const safeTitle = this.escapeHtml(contractTitle || '');
    const subject = `Vous êtes invité(e) à signer un contrat : ${contractTitle || ''}`;
    const signupUrl = `${config.frontendUrl}/signup?redirect=/contract-details?id=${draftId}`;
    const html = this._wrapEmail({
      heading: `Bonjour ${safeName},`,
      bodyHtml: `
        <p style="color: #aaa; line-height: 1.7; margin-bottom: 8px;">
          Vous avez été invité(e) à signer le contrat suivant sur ContracTify :
        </p>
      `,
      contractTitle: `${safeTitle}<p style="color: #666; font-size: 12px; margin: 8px 0 0; font-family: monospace;">Réf: ${draftId.slice(0, 8)}...</p>`,
      ctaLabel: 'Créer mon compte et signer',
      ctaUrl: signupUrl,
      footerNote: `
        Pour signer ce contrat, vous devez d'abord créer un compte gratuit sur ContracTify — un portefeuille numérique sécurisé vous sera automatiquement attribué.<br>
        Votre signature aura valeur légale, conformément à la loi applicable à ce contrat.<br>
        Si vous n'attendiez pas cet email, vous pouvez l'ignorer.
      `,
    });
    await this.sendEmail(to, subject, html);
  }

  async sendSignatureRequest(to, contractTitle, contractId, signerName) {
    const safeName = this.escapeHtml(signerName || '');
    const safeTitle = this.escapeHtml(contractTitle || '');
    const subject = `Signature requise : ${contractTitle || ''}`;
    const html = this._wrapEmail({
      heading: `Bonjour ${safeName},`,
      bodyHtml: `
        <p style="color: #aaa; line-height: 1.7; margin-bottom: 8px;">
          Le contrat suivant a été déployé sur la blockchain et attend votre signature :
        </p>
      `,
      contractTitle: safeTitle,
      ctaLabel: 'Voir et signer le contrat',
      ctaUrl: `${config.frontendUrl}/contract-details?id=${contractId}`,
    });

    await this.sendEmail(to, subject, html);
  }

  async sendContractFinalizedNotification(to, contractTitle, contractId) {
    const safeTitle = this.escapeHtml(contractTitle || '');
    const subject = `Félicitations ! Le contrat "${contractTitle || ''}" est maintenant actif`;
    const html = this._wrapEmail({
      heading: 'Votre contrat est actif !',
      bodyHtml: `
        <p style="color: #aaa; line-height: 1.7; margin-bottom: 8px;">
          Toutes les signatures ont été collectées. Le contrat suivant est maintenant actif sur la blockchain, et un NFT de preuve a été généré avec succès :
        </p>
      `,
      contractTitle: safeTitle,
      ctaLabel: 'Consulter le contrat actif',
      ctaUrl: `${config.frontendUrl}/contract-details?id=${contractId}`,
      ctaColor: '#4CAF50',
      ctaTextColor: '#ffffff',
    });
    await this.sendEmail(to, subject, html);
  }

  async sendContractStatusNotification(to, contractTitle, contractId, newStatus) {
    const safeTitle = this.escapeHtml(contractTitle || '');
    const safeStatus = this.escapeHtml(newStatus || '');
    const subject = `Mise à jour du contrat : "${contractTitle || ''}"`;
    const html = this._wrapEmail({
      heading: 'Statut du contrat mis à jour',
      bodyHtml: `
        <p style="color: #aaa; line-height: 1.7; margin-bottom: 8px;">
          Le contrat suivant a changé de statut : <strong style="color: #fff;">${safeStatus}</strong>
        </p>
      `,
      contractTitle: safeTitle,
      ctaLabel: 'Consulter les détails du contrat',
      ctaUrl: `${config.frontendUrl}/contract-details?id=${contractId}`,
    });
    await this.sendEmail(to, subject, html);
  }

  async sendGenericNotification(to, title, message, contractCacheId) {
    const safeTitle = this.escapeHtml(title || '');
    const safeMessage = this.escapeHtml(message || '');
    const html = this._wrapEmail({
      heading: safeTitle,
      bodyHtml: `<p style="color: #aaa; line-height: 1.7; margin-bottom: 8px;">${safeMessage}</p>`,
      ctaLabel: contractCacheId ? 'Voir le contrat' : undefined,
      ctaUrl: contractCacheId ? `${config.frontendUrl}/contract-details?id=${contractCacheId}` : undefined,
    });
    // The subject must stay plain text — safeTitle is HTML-escaped for the body and would
    // otherwise leak literal entities (e.g. "n&#039;avez") into the email client's subject line.
    await this.sendEmail(to, title || '', html);
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
