const mongoose = require("mongoose");

// Utility function to generate a random referral ID
function generateReferralId(length = 6) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // Uppercase letters and digits
  let referralId = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    referralId += characters[randomIndex]; // Append a random character
  }

  return referralId; // Return the generated referral ID
}

const userSchema = new mongoose.Schema({
  walletNumber: { type: String, required: true, unique: true },
  referralId: { type: String, required: true, unique: true },
  referredBy: { type: String, default: null },
  referrals: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  dailyClaims: { type: Number, default: 0 },
  ipAddresses: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

// Static method to register a user
userSchema.statics.Register = async function (
  walletNumber,
  ipAddress,
  referredBy
) {
  // Check if the user already exists
  const existingUser = await this.findOne({ walletNumber });
  if (existingUser) {
    return { user: existingUser, message: "User Exists" };
  }

  // Check for existing user by IP address
  const existingUserByIP = await this.findOne({
    ipAddresses: { $in: [ipAddress] },
  });
  if (existingUserByIP) {
    return {
      user: null,
      message:
        "Warning: Only one account per user is permitted. Please refrain from creating multiple accounts to avoid potential suspension.",
    };
  }

  // If a referral ID was provided, increment the referrer's points and referrals
  if (referredBy) {
    const referrer = await this.findOne({ referralId: referredBy });
    if (referrer) {
      referrer.referrals += 1; // Increment the referrer's referral count
      referrer.points += 10; // Award points for the referral
      await referrer.save(); // Save the updated referrer data
    }
  }

  // Generate a unique referral ID
  let referralId = generateReferralId(); // Default length is 6 characters
  let linkExists = await this.findOne({ referralId });

  while (linkExists) {
    referralId = generateReferralId(); // Regenerate if the ID already exists
    linkExists = await this.findOne({ referralId });
  }

  // Create the new user
  const newUser = new this({
    walletNumber,
    referralId, // Set the generated referral ID for this user
    referredBy: referredBy || null, // Set the referredBy field if the user is referred
    referrals: 0,
    points: 0,
    dailyClaims: 0,
    ipAddresses: [ipAddress],
  });

  // Save the new user's data
  await newUser.save();

  return {
    user: newUser,
    message:
      "Welcome to the platform! Your account has been successfully created.",
  };
};

module.exports = mongoose.model("User", userSchema);
