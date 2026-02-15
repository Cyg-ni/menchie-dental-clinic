const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Setup the email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "YOUR_CLINIC_EMAIL@gmail.com",
    pass: "YOUR_APP_SPECIFIC_PASSWORD", // Not your regular password!
  },
});

exports.sendAppointmentConfirmation = functions.firestore
  .document("appointments/{appointmentId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();

    const mailOptions = {
      from: '"Menchie\'s Dental Clinic" <YOUR_CLINIC_EMAIL@gmail.com>',
      to: data.patientEmail,
      subject: "We've Received Your Appointment Request! 🦷",
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Hello, ${data.patientFirstName}!</h2>
          <p>Thank you for choosing <strong>Menchie's Dental Clinic</strong>. We have received your request for an appointment.</p>
          <hr />
          <p><strong>Service:</strong> ${data.serviceType}</p>
          <p><strong>Date:</strong> ${data.scheduledDate}</p>
          <p><strong>Time:</strong> ${data.scheduledTime}</p>
          <hr />
          <p>Please note: This is a <em>request only</em>. Our staff will review the schedule and contact you shortly to confirm the booking.</p>
          <p>If you have questions, feel free to reply to this email.</p>
          <p>See you soon!</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return console.log("Success: Confirmation email sent to", data.patientEmail);
    } catch (error) {
      return console.error("Error sending email:", error);
    }
  });