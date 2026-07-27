import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

/**
 * Sends an OTP email to the user.
 * @param {string} email - Recipient email address
 * @param {string|number} otp - The One-Time Password to send
 */
export const sendOtpEmail = async (email, otp) => {
    // 👇 This will print the OTP directly to your terminal console
    console.log(`====================================`);
    console.log(`🔑 DEV MODE - OTP for ${email}: ${otp}`);
    console.log(`====================================`);

    try {
        const mailOptions = {
            from: `"Your App Name" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h2 style="color: #333; text-align: center;">Email Verification</h2>
                    <p style="color: #555; font-size: 16px;">Hello,</p>
                    <p style="color: #555; font-size: 16px;">Your verification code is:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 5px; background: #F3F4F6; padding: 10px 20px; border-radius: 5px; display: inline-block;">${otp}</span>
                    </div>
                    <p style="color: #555; font-size: 14px;">This code is valid for 1 minute. If you didn't request this, please ignore this email.</p>
                    <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">&copy; ${new Date().getFullYear()} Your App Name. All rights reserved.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("OTP Email sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending OTP email:", error);
        throw new Error("Failed to send verification email. Please try again.");
    }
};