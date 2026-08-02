const admin = require('firebase-admin');

const {
  checkLegacyMigrationEligibility
} = require('./src/checkLegacyMigrationEligibility');
const {
  validateLegacyMigrationInput
} = require('./src/validateLegacyMigrationInput');
const {
  checkLegacyAccountExists
} = require('./src/checkLegacyAccountExists');
const {
  verifyLegacyAccountPassword
} = require('./src/verifyLegacyAccountPassword');
const {
  linkLegacyAccount
} = require('./src/linkLegacyAccount');

admin.initializeApp();

exports.checkLegacyMigrationEligibility = checkLegacyMigrationEligibility;
exports.validateLegacyMigrationInput = validateLegacyMigrationInput;
exports.checkLegacyAccountExists = checkLegacyAccountExists;
exports.verifyLegacyAccountPassword = verifyLegacyAccountPassword;
exports.linkLegacyAccount = linkLegacyAccount;
