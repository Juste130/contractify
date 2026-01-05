const nodemailer = require('nodemailer');
console.log('Type of nodemailer:', typeof nodemailer);
console.log('Keys:', Object.keys(nodemailer));
console.log('Has createTransporter:', typeof nodemailer.createTransporter);

try {
    const transporter = nodemailer.createTransporter({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: 'test', pass: 'test' }
    });
    console.log('Transporter created successfully');
} catch (e) {
    console.error('Error creating transporter:', e);
}
