# **Live QR Code Attendance System**

This project is a web-based attendance system that uses a time-based, refreshing QR code for secure check-ins. The system consists of a simple HTML page that generates the QR code and a Google Apps Script that validates the submissions from a Google Form.

## **How It Works**

1. **QR Code Generation:** The HTML page uses JavaScript and the Web Crypto API to generate a unique, time-sensitive combined token. This token includes both a cryptographic hash and the current time bucket, making it highly secure and difficult to guess. The token is then embedded into a Google Form URL to create the QR code.  
2. **QR Code Refresh:** The QR code automatically refreshes every **30 seconds** (or your configured interval) with a new token, ensuring that old codes cannot be reused.  
3. **Submission:** When a user scans the QR code, they are directed to a Google Form with the single combined token pre-filled. They simply need to complete any other required fields and submit the form.  
4. **Backend Validation:** A Google Apps Script, triggered by each form submission, validates the submitted token against the current time. It allows for a small grace period (the previous time interval) to account for network latency. To handle a large number of simultaneous submissions, the script uses the **Google Apps Script Lock Service** to ensure each submission is processed one by one without conflicts.
5. **Status Update:** The script writes the validation status (**VALID** or **INVALID**) to a new column in the linked Google Sheet, providing a clear record of attendance.

## **Getting Started**

Follow these steps to set up the system.

### **Step 1: Create the Google Form and Spreadsheet**

1. Create a new Google Form with the following questions:  
   * `Combined Token` (Short answer text)  
   * `Email Address` (Short answer text, optional but recommended for user feedback)  
   * Any other attendance information you require (e.g., Student ID, Name).  
2. Go to the Google Form settings and create a linked Google Sheet to store the responses.  
3. Pre-fill the form with dummy data for the `Combined Token`.  
   * Click the three dots in the top-right corner of the form builder.  
   * Select "Get pre-filled link."  
   * Fill out the `Combined Token` field with any placeholder text (e.g., {combinedToken}).  
   * Click "Get link" and copy the full URL. This is the GOOGLE\_FORM\_PREFILLED\_URL for your HTML file.

### **Step 2: Set up the Google Apps Script**

1. In your Google Form, click the three dots and go to "Script editor."  
2. Copy and paste the provided Google Apps Script code into the script editor, overwriting any existing code.  
3. **Update the configuration:**  
   * Set a **secure SECRET\_KEY**.  
   * Ensure `REFRESH\_INTERVAL\_SECONDS` is the same as in your HTML file.  
4. **Save the script.**

### **Step 3: Set up the onFormSubmit Trigger**

1. In the Apps Script editor, click the clock icon on the left sidebar to open the Triggers menu.  
2. Click **\+ Add Trigger**.  
3. Configure the trigger as follows:  
   * **Choose which function to run:** `onFormSubmit`  
   * **Select event source:** From spreadsheet  
   * **Select event type:** On form submit  
4. Click **Save**. You will need to grant permissions for the script to run.

### **Step 4: Configure the HTML File**

1. Open your HTML file in a text editor.  
2. In the `\<script\>` section, update the `GOOGLE\_FORM\_PREFILLED\_URL` with the URL you copied in Step 1\.  
3. Ensure the `SECRET\_KEY` and `REFRESH\_INTERVAL\_SECONDS` match the values in your Google Apps Script.

## **Important Security Notes**

* **SECRET\_KEY:** This key is the foundation of your system's security. It should be a long, random string. **Do not use "secret" in a production environment.**  
* **Trigger:** The onFormSubmit trigger is crucial. Without it, the Apps Script will not run automatically to validate submissions.  
* **Time Synchronization:** Validation relies on the time on the user's device. While the code accounts for a small delay, significant clock differences can cause submissions to fail.

Enjoy your automated attendance system\!

