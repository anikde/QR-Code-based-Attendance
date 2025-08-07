// --- CONFIGURATION ---
// IMPORTANT: These values MUST EXACTLY MATCH the values in your HTML file.
const SECRET_KEY = 'secret'; // Replace this with a secure key.
const REFRESH_INTERVAL_SECONDS = 30; // Updated to match the HTML file.
// These are the Google Form question titles for the token and timestamp bucket.
// They are more reliable for use with e.namedValues.
const TOKEN_QUESTION_TITLE = 'Token';
const TIMESTAMP_BUCKET_TITLE = 'TimestampBucket';
const EMAIL_QUESTION_TITLE = 'Email Address'; // New constant for the email field.
const EMAIL_SUBJECT = 'Attendance Submission Status CSL3040'; // New constant for the email subject line.


/**
 * This function runs automatically whenever a new form response is submitted.
 * @param {Object} e The event object containing the form response data.
 */
function onFormSubmit(e) {
  // Get the sheet where responses are stored
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Find the column index for "Validation Status"
  let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let validationColumnIndex = headers.indexOf("Validation Status") + 1;
  
  // If the "Validation Status" column doesn't exist, create it.
  if (validationColumnIndex === 0) {
    const lastColumn = sheet.getLastColumn();
    // Add the header to the next available column
    sheet.getRange(1, lastColumn + 1).setValue("Validation Status");
    // Update the headers array to get the new column index
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    validationColumnIndex = headers.indexOf("Validation Status") + 1;
  }
  
  // Get the email and submitted token from the form response
  const userEmail = e.namedValues[EMAIL_QUESTION_TITLE] ? e.namedValues[EMAIL_QUESTION_TITLE][0] : null;
  const submittedToken = e.namedValues[TOKEN_QUESTION_TITLE] ? e.namedValues[TOKEN_QUESTION_TITLE][0] : null;
  
  if (!submittedToken) {
    Logger.log("Error: Could not find submitted token. Check if TOKEN_QUESTION_TITLE is correct.");
    return;
  }

  // --- Token Validation Logic ---
  // Get the timestamp of the submission
  const submissionTime = new Date(e.namedValues['Timestamp'][0]);

  // Generate the token that was valid at the moment of submission
  const currentToken = generateTokenForTime(submissionTime);
  
  // Also generate the token for the PREVIOUS interval to allow for delays
  // (e.g., user scans at second 9, but submits at second 11)
  const previousIntervalTime = new Date(submissionTime.getTime() - REFRESH_INTERVAL_SECONDS * 1000);
  const previousToken = generateTokenForTime(previousIntervalTime);

  let validationResult = "INVALID";
  let emailBody = "Your attendance submission was invalid. Please ensure you scan the most recent QR code and try again.";
  
  // Check if the submitted token matches either the current or previous valid token
  if (submittedToken === currentToken || submittedToken === previousToken) {
    validationResult = "VALID";
    emailBody = "Your attendance submission was successful. Thank you!";
  }
  
  // Write the result to the "Validation Status" column for the newly submitted row
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, validationColumnIndex).setValue(validationResult);
  Logger.log(`Submitted Token: ${submittedToken}, Valid Tokens: [${currentToken}, ${previousToken}], Result: ${validationResult}`);

  // --- Email Notification Logic ---
  // Check if a valid email was provided before attempting to send
  if (userEmail) {
    try {
      MailApp.sendEmail(userEmail, EMAIL_SUBJECT, emailBody);
      Logger.log(`Email sent to ${userEmail} with status: ${validationResult}`);
    } catch (error) {
      Logger.log(`Error sending email to ${userEmail}: ${error.message}`);
    }
  } else {
    Logger.log("No email address provided to send a notification.");
  }
}

/**
 * Generates a time-based token for a specific timestamp.
 * This logic mirrors the JavaScript in the HTML file.
 * @param {Date} dateObject The timestamp to generate a token for.
 * @returns {string} The generated 10-character token.
 */
function generateTokenForTime(dateObject) {
  const timestampBucket = Math.floor(dateObject.getTime() / 1000 / REFRESH_INTERVAL_SECONDS);
  const dataToHash = `${SECRET_KEY}-${timestampBucket}`;
  
  // Hash the data using SHA-256
  const hashBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, dataToHash);
  
  // Convert the byte array to a hex string
  let hashHex = '';
  for (let i = 0; i < hashBytes.length; i++) {
    let byte = hashBytes[i];
    if (byte < 0) {
      byte += 256;
    }
    const hex = byte.toString(16);
    if (hex.length === 1) {
      hashHex += '0';
    }
    hashHex += hex;
  }
  
  // Return the first 10 characters
  return hashHex.substring(0, 10);
}
