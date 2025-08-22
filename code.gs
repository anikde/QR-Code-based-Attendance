// --- CONFIGURATION ---
// IMPORTANT: These values MUST EXACTLY MATCH the values in your HTML file.
const SECRET_KEY = 'secret'; // Replace this with a secure key.
const REFRESH_INTERVAL_SECONDS = 30; // Updated to match the HTML file.

// This is the Google Form question title for the single combined token.
const SINGLE_TOKEN_QUESTION_TITLE = 'Combined Token'; // New constant for the single token field.
const EMAIL_QUESTION_TITLE = 'Email Address'; 
const EMAIL_SUBJECT = 'Attendance Submission Status CSL3040'; 


/**
 * This function runs automatically whenever a new form response is submitted.
 * @param {Object} e The event object containing the form response data.
 */
function onFormSubmit(e) {
  // Get a public lock that will prevent concurrent access to the code.
  const lock = LockService.getPublicLock();
  
  // Wait for up to 30 seconds for the lock to become available.
  try {
    lock.waitLock(30000); 
  } catch (error) {
    Logger.log("Could not obtain lock after 30 seconds. Skipping this execution to avoid conflicts.");
    return; // Exit the function if the lock cannot be acquired
  }

  // --- All critical operations are now within the locked section ---
  
  try {
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
    
    const lastRow = sheet.getLastRow();
    
    const userEmail = e.namedValues[EMAIL_QUESTION_TITLE] ? e.namedValues[EMAIL_QUESTION_TITLE][0] : null;
    const combinedToken = e.namedValues[SINGLE_TOKEN_QUESTION_TITLE] ? e.namedValues[SINGLE_TOKEN_QUESTION_TITLE][0] : null;


    if (!combinedToken) {
      // If the combined token is missing, log an error and mark as INVALID.
      sheet.getRange(lastRow, validationColumnIndex).setValue("INVALID");
      Logger.log("Error: Could not find submitted combined token. Check if SINGLE_TOKEN_QUESTION_TITLE is correct.");
      return;
    }

    // Split the combined token into the cryptographic token and the timestamp bucket
    const parts = combinedToken.split('-');
    if (parts.length !== 2) {
      // If the token is not in the correct format, mark as INVALID.
      sheet.getRange(lastRow, validationColumnIndex).setValue("INVALID");
      Logger.log("Error: Invalid combined token format.");
      return;
    }
    const submittedToken = parts[0];
    const submittedTimestampBucket = parseInt(parts[1], 10);
    
    // --- Token Validation Logic ---
    // Get the timestamp of the submission
    const submissionTime = new Date(e.namedValues['Timestamp'][0]);

    // Generate the token that was valid at the moment of submission
    const currentTimestampBucket = Math.floor(submissionTime.getTime() / 1000 / REFRESH_INTERVAL_SECONDS);
    const currentToken = generateTokenForBucket(currentTimestampBucket);
    
    // Also generate the token for the PREVIOUS interval to allow for delays
    const previousTimestampBucket = currentTimestampBucket - 1;
    const previousToken = generateTokenForBucket(previousTimestampBucket);

    let validationResult = "INVALID";
    let emailBody = "Your attendance submission was invalid. Please ensure you scan the most recent QR code and try again.";
    
    // Check if the submitted token matches either the current or previous valid token
    // The timestamp bucket must also match the generated token's bucket.
    if ((submittedToken === currentToken && submittedTimestampBucket === currentTimestampBucket) || 
        (submittedToken === previousToken && submittedTimestampBucket === previousTimestampBucket)) {
      validationResult = "VALID";
      emailBody = "Your attendance submission was successful. Thank you!";
    }
    
    // Write the result to the "Validation Status" column for the determined target row
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

  } finally {
    // Release the lock at the end, regardless of whether an error occurred.
    // This is crucial to prevent the script from getting stuck.
    if (lock) {
      lock.releaseLock();
    }
  }
}

/**
 * Generates a time-based token for a specific timestamp bucket.
 * This logic mirrors the JavaScript in the HTML file.
 * @param {number} timestampBucket The timestamp bucket to generate a token for.
 * @returns {string} The generated 10-character token.
 */
function generateTokenForBucket(timestampBucket) {
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
