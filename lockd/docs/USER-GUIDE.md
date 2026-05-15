# Khurklockd — User Guide

**Version:** 1.0.0 | **Last Updated:** 2026-05-13

Welcome to Khurklockd, a local-first, zero-knowledge password manager. This guide walks you through every feature so you can manage your passwords securely and confidently.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Understanding Your Vault](#2-understanding-your-vault)
3. [Adding and Managing Items](#3-adding-and-managing-items)
4. [Password Generator](#4-password-generator)
5. [TOTP / Two-Factor Authentication](#5-totp--two-factor-authentication)
6. [Importing Passwords](#6-importing-passwords)
7. [Exporting Your Vault](#7-exporting-your-vault)
8. [Breach Monitoring](#8-breach-monitoring)
9. [Emergency Access](#9-emergency-access)
10. [Vault Settings](#10-vault-settings)
11. [Security Best Practices](#11-security-best-practices)
12. [Keyboard Shortcuts](#12-keyboard-shortcuts)
13. [FAQ](#13-faq)

---

## 1. Getting Started

### 1.1 Opening the App

Open your browser and navigate to the Khurklockd app:

- **Live demo:** [skulls206-creator.github.io/khurklockd](https://skulls206-creator.github.io/khurklockd/)
- **Local:** If running locally, open [http://localhost:3000](http://localhost:3000)

You will see the landing page with a lock icon and the option to create a new vault or open an existing one.

### 1.2 Creating Your First Vault

1. Click **"Create New Vault"** on the landing page.
2. Choose a **master password**. This is the only password you need to remember — it unlocks everything else.
   - Use the built-in strength meter as a guide. Aim for **Strong** or **Very Strong**.
   - 12+ characters recommended. A passphrase (e.g., `correct-horse-battery-staple`) is easier to remember and highly secure.
3. Optionally, name your vault (e.g., "Personal", "Work").
4. Choose where to save your `.khurklockd` file. This is your encrypted vault — treat it like any important document.
5. Click **"Create Vault"**.

Your vault is now created and unlocked. You will see the Dashboard.

### 1.3 Opening an Existing Vault

1. Click **"Open Vault"** on the landing page.
2. Select your `.khurklockd` file using the file picker.
3. Enter your master password.
4. Click **"Unlock"**.

If the password is correct, the vault opens to the Dashboard. If incorrect, you will see "Wrong password" — try again.

### 1.4 Locking and Unlocking

- **Manual lock:** Click the lock icon in the sidebar header, or press `Ctrl+Shift+L` (Windows/Linux) / `Cmd+Shift+L` (macOS).
- **Auto-lock:** After a period of inactivity (default: 5 minutes), the vault locks automatically. You can change this in Settings.
- **Tab-away lock:** If you switch browser tabs for more than 30 seconds, the auto-lock timer is accelerated.

When locked, all plaintext is cleared from memory. You must re-enter your master password to unlock.

---

## 2. Understanding Your Vault

### 2.1 The Vault File

Your entire password database lives in a single `.khurklockd` file. This file:

- Is **encrypted with AES-256-GCM**. Without your master password, it is meaningless ciphertext.
- Is **portable**. Store it on your computer, sync it via cloud storage (Dropbox, Google Drive, iCloud), or carry it on a USB drive.
- Contains **all item types**: logins, notes, credit cards, identities, and digital wallets.
- Contains **all settings**: lock timeout, generator preferences, theme, and more.

### 2.2 Item Types

| Type | What It Stores | Examples |
|------|---------------|----------|
| **Login** | Website credentials | Email accounts, social media, banking |
| **Note** | Free-form text | Software license keys, Wi-Fi passwords, journal entries |
| **Card** | Payment card details | Credit cards, debit cards, loyalty cards |
| **Identity** | Personal information | Name, address, phone, SSN, passport number |
| **Wallet** | Digital wallet data | Crypto wallet seeds, recovery phrases, exchange API keys |

### 2.3 The Dashboard

The Dashboard is your home screen. It shows:

- **Password health stats:** Counts of weak passwords, reused passwords, and breached items.
- **Favorites:** Items you have starred for quick access.
- **Recent items:** Your most recently modified items.

---

## 3. Adding and Managing Items

### 3.1 Creating a New Item

1. Click **"+ New Item"** in the sidebar or Dashboard.
2. Select the item type: Login, Note, Card, Identity, or Wallet.
3. Fill in the fields. Required fields are marked with an asterisk.
4. Click **"Save"**.

#### Login Items

- **Name:** A display name (e.g., "Gmail", "Netflix").
- **URL(s):** One or more website URLs where this login is used.
- **Username:** Your login username or email.
- **Password:** Your password. Use the generator (dice icon) to create a strong one, or type/paste your own.
- **TOTP Secret:** If this account uses two-factor authentication, paste the TOTP setup key here to generate codes inside Khurklockd.
- **Notes:** Any additional information (security questions, PINs, account numbers).
- **Custom Fields:** Add key-value pairs for anything not covered by the standard fields.

#### Note Items

- **Name:** A title for the note.
- **Subject:** Optional subtitle or subject line.
- **Content:** The note body. Supports plain text.

#### Card Items

- **Name:** A label (e.g., "Chase Sapphire", "Work Amex").
- **Cardholder Name:** As it appears on the card.
- **Number:** The full card number.
- **Brand:** Visa, Mastercard, Amex, Discover, or Other.
- **Expiration:** Month and year.
- **CVV:** The 3- or 4-digit security code.
- **Billing Address:** Optional billing address.
- **PIN:** For debit cards.

#### Identity Items

- **Personal details:** Title, first/middle/last name, email, phone.
- **Address:** Street, city, state, postal code, country.
- **Sensitive identifiers:** Date of birth, national ID / SSN, passport number.
- **Custom fields:** Additional identifiers (driver's license, voter ID, etc.).

#### Wallet Items

- **Cryptocurrency wallets:** Store seed phrases, private keys, and wallet addresses.
- **Exchange accounts:** API keys and secrets.
- **Recovery codes:** Backup codes for 2FA recovery.

### 3.2 Editing an Item

1. Click an item in the sidebar or Dashboard to open its detail view.
2. Click **"Edit"** (pencil icon).
3. Make your changes.
4. Click **"Save"**.

### 3.3 Deleting an Item

1. Open the item detail view.
2. Click **"Delete"** (trash icon).
3. Confirm the deletion.

Deleted items are permanently removed from the vault on the next save. There is no trash/recycle bin — consider backing up your vault before bulk deletions.

### 3.4 Favorite Items

Click the star icon on any item to mark it as a favorite. Favorites appear at the top of the sidebar and on the Dashboard for quick access.

### 3.5 Tags

Add tags to any item for organization. Tags act as labels — you can filter the item list by tag. Common tags: `work`, `personal`, `finance`, `social`, `shopping`.

### 3.6 Searching Your Vault

Use the search bar at the top of the sidebar (or press `/`) to find items by name, username, URL, or tags. Results update as you type.

---

## 4. Password Generator

The built-in password generator helps you create strong, unique passwords for every account.

### 4.1 Opening the Generator

Navigate to **Generator** in the sidebar, or click the dice icon next to any password field.

### 4.2 Random Passwords

Configure your password:

| Option | Description | Default |
|--------|-------------|---------|
| **Length** | 8–128 characters | 20 |
| **Uppercase** (A-Z) | Include uppercase letters | On |
| **Lowercase** (a-z) | Include lowercase letters | On |
| **Digits** (0-9) | Include numbers | On |
| **Symbols** (!@#$%...) | Include special characters | On |
| **Exclude ambiguous** | Remove I, l, 1, O, 0 | On |
| **Min of each** | Require at least one from each selected set | 1 |

Click **"Regenerate"** to get a new password. Click **"Copy"** to copy it to your clipboard.

### 4.3 Passphrases

Passphrases are easier to remember and type than random passwords while remaining cryptographically strong.

| Option | Description | Default |
|--------|-------------|---------|
| **Word count** | 3–10 words | 5 |
| **Separator** | Character between words | `-` (hyphen) |
| **Capitalize** | Capitalize each word | Off |
| **Include number** | Append a random digit | Off |
| **Word list** | EFF large (7,776 words) or short list | EFF large |

Example output: `correct-horse-battery-staple-lunar`

At 5 words from the EFF large list, a passphrase provides ~64 bits of entropy — strong enough for most purposes.

### 4.4 Password Strength

Every generated or entered password is evaluated by the strength meter using [zxcvbn](https://github.com/dropbox/zxcvbn), Dropbox's password strength estimator.

| Score | Label | Meaning |
|-------|-------|---------|
| 0 | Very Weak | Crackable instantly |
| 1 | Weak | Crackable in < 1 day |
| 2 | Fair | Crackable in < 1 month |
| 3 | Strong | Crackable in < 1 year |
| 4 | Very Strong | Centuries to crack |

The meter also provides **actionable feedback** — e.g., "Add another word or two" (for passphrases) or "Avoid repeated characters" (for random passwords).

---

## 5. TOTP / Two-Factor Authentication

Khurklockd includes a built-in TOTP authenticator so you don't need a separate app. Codes are generated offline in your browser.

### 5.1 Setting Up TOTP for an Account

1. When you enable 2FA on a website (e.g., Google, GitHub, Twitter), the site shows a QR code or setup key.
2. In Khurklockd, edit the login item for that account.
3. In the **TOTP Secret** field:
   - **QR code:** Click the QR scanner button to scan the code with your camera.
   - **Manual key:** Paste the setup key (usually 16–32 characters like `JBSWY3DPEHPK3PXP`).
4. Save the item.

### 5.2 Viewing TOTP Codes

Navigate to **TOTP** in the sidebar to see all your codes in one place. Each code:

- Displays as a 6-digit number.
- Includes a circular countdown timer showing seconds remaining (30-second period).
- Auto-refreshes when the period expires.

### 5.3 Copying a Code

Click the copy button next to any code to copy it to your clipboard. The clipboard is automatically cleared after the delay configured in Settings (default: 30 seconds).

### 5.4 TOTP Details

| Specification | Value |
|---------------|-------|
| Algorithm | SHA-1 (HMAC-SHA1) |
| Digits | 6 (configurable: 6 or 8) |
| Period | 30 seconds (configurable: 30 or 60) |
| Standard | RFC 6238 (TOTP), RFC 4226 (HOTP) |
| Clock skew | ±1 time step tolerated during verification |

---

## 6. Importing Passwords

You can import passwords from other password managers or from a CSV/JSON file.

### 6.1 Supported Formats

| Source | Format | Notes |
|--------|--------|-------|
| **1Password** | 1PUX, CSV | Exported from 1Password desktop or web |
| **Bitwarden** | JSON, CSV | Exported from Bitwarden vault |
| **LastPass** | CSV | Exported from LastPass web vault |
| **Dashlane** | CSV | Exported from Dashlane |
| **KeePass** | CSV, XML | Exported from KeePass |
| **Generic** | CSV | Any CSV with `name`, `url`, `username`, `password` columns |
| **Auto-detect** | — | Let Khurklockd detect the format automatically |

### 6.2 How to Import

1. Navigate to **Import** in the sidebar.
2. Click **"Choose File"** and select your exported file.
3. Khurklockd auto-detects the format (or you can select it manually).
4. Review the parsed entries. A preview table shows what will be imported.
5. Map columns if needed (for CSV imports).
6. Select which entries to import (all, or individual checkboxes).
7. Click **"Import"**.

### 6.3 What Gets Imported

| Field | Imported? |
|-------|-----------|
| Name / Title | Yes |
| URL | Yes |
| Username / Email | Yes |
| Password | Yes |
| Notes | Yes |
| TOTP Secret | Yes (if present in export) |
| Folders / Categories | Mapped to tags |
| Custom fields | Yes (when supported by export format) |

### 6.4 After Importing

- Imported items are added to your current vault.
- Duplicates are not automatically detected — review and remove any duplicates manually.
- The original export file is not modified.
- Save your vault after importing to persist the changes.

---

## 7. Exporting Your Vault

Exporting creates a plaintext copy of your vault. **This file is not encrypted — handle it with extreme care.**

### 7.1 Export Formats

| Format | Description | Use Case |
|--------|-------------|----------|
| **Encrypted JSON** | AES-256-GCM encrypted export | Migrating between Khurklockd vaults |
| **Plain JSON** | Unencrypted JSON with all items | Full backup, manual inspection |
| **CSV** | Comma-separated values | Importing into another password manager |

### 7.2 How to Export

1. Navigate to **Settings** > **Export Vault**.
2. Select the export format.
3. If exporting plaintext (JSON or CSV), confirm that you understand the security risk.
4. Choose a save location.
5. Click **"Export"**.

### 7.3 Security Warning

> **Plaintext exports contain all your passwords in readable form.** Delete the export file immediately after use. Consider using an encrypted export for routine backups.

---

## 8. Breach Monitoring

Khurklockd integrates with [Have I Been Pwned (HIBP)](https://haveibeenpwned.com) to check whether your accounts have appeared in known data breaches.

### 8.1 Privacy Model

Khurklockd uses HIBP's **k-anonymity model**. Here is how it protects your privacy:

1. Your email address is SHA-1 hashed locally in your browser.
2. Only the **first 5 characters** of the hash are sent to the HIBP server.
3. The server returns all hash suffixes matching that prefix.
4. Khurklockd checks locally whether your full hash is in the returned list.

**No plaintext email address ever leaves your browser.** The HIBP server cannot determine which email you are checking.

### 8.2 Scanning Your Vault

1. Navigate to **Breach** in the sidebar.
2. Click **"Scan Now"**.
3. Khurklockd extracts all unique email addresses and usernames from your vault items.
4. Each is checked against the HIBP database (with a 1.6-second delay between requests to respect rate limits).
5. Results appear in a list showing which items are affected and which breaches they appear in.

### 8.3 Understanding Breach Results

Each breach result shows:

- **Breach name:** e.g., "Adobe", "LinkedIn", "Collection #1"
- **Breach date:** When the breach occurred.
- **Data exposed:** e.g., "Email addresses", "Passwords", "Usernames".
- **Severity:** Verified breach, sensitive data, or unverified.

### 8.4 What to Do If You Are Breached

1. **Change the password** for the affected account immediately.
2. **Enable 2FA** if you have not already.
3. **Check other accounts** that use the same password.
4. **Use unique passwords** for every account going forward (Khurklockd's generator helps with this).
5. **Monitor** the account for suspicious activity.

---

## 9. Emergency Access

The Dead Man's Switch ensures your trusted contacts can access your vault if you become incapacitated or unreachable.

### 9.1 How It Works

1. **Arm the switch:** You set a check-in interval (e.g., 7 days) and a grace period (e.g., 3 days).
2. **Regular check-ins:** Each time you unlock your vault, the check-in timestamp is updated.
3. **Missed check-in:** If you fail to unlock your vault for `checkInterval + gracePeriod` days, the switch triggers.
4. **Trigger:** Your encrypted vault access is sent to your trusted contacts.

### 9.2 Setting Up Emergency Access

1. Navigate to **Emergency** in the sidebar.
2. Click **"Add Contact"**.
3. Enter the contact's **name** and **email address**.
4. **Upload their PGP public key.** The vault access information is encrypted with this key so only the intended recipient can decrypt it.
5. Set the **access delay** (minimum 24 hours). This is the waiting period after the switch triggers before access is granted.
6. Save the contact.

### 9.3 Configuring the Dead Man's Switch

1. In the Emergency page, click **"Configure Switch"**.
2. Set the **check interval** (1–90 days). Default: 7 days.
3. Set the **grace period** (1–30 days). Default: 3 days.
4. Select which **contacts** to notify when the switch triggers.
5. Optionally, add a **personal message** to include with the notification.
6. Click **"Arm Switch"**.

### 9.4 Managing the Switch

- **Check status:** The Emergency page shows whether the switch is armed and when your last check-in occurred.
- **Disarm:** Click **"Disarm"** to cancel the switch at any time.
- **Re-arm:** If you disarm and later want to re-arm, you must configure and arm the switch again.

### 9.5 What Contacts Receive

When the switch triggers:

1. Each contact receives an email notification (via your connected email, if available).
2. The email contains an **encrypted shard** of your vault access information, encrypted with that contact's PGP public key.
3. The contact decrypts the shard using their private key and follows the instructions to gain access.

**No single contact can access your vault alone** (future: Shamir's Secret Sharing for m-of-n threshold).

---

## 10. Vault Settings

Access settings from the **Settings** page in the sidebar.

### 10.1 Security Settings

| Setting | Description | Default | Range |
|---------|-------------|---------|-------|
| **Lock timeout** | Minutes of inactivity before auto-lock | 5 | 1–60, or 0 (never) |
| **Clipboard clear delay** | Seconds before copied passwords are cleared from clipboard | 30 | 5–300 |
| **Argon2id iterations** | Time cost for key derivation | 3 | 1–10 |
| **Argon2id memory** | Memory cost (KiB) for key derivation | 65,536 (64 MiB) | 8,192–262,144 |
| **Argon2id parallelism** | CPU threads for key derivation | 4 | 1–8 |
| **Show strength indicators** | Display password strength meter | On | On / Off |

### 10.2 Changing Argon2id Parameters

Higher values increase unlock time but improve brute-force resistance. The Settings page includes a **benchmark** tool that runs key derivation with current parameters and reports the elapsed time:

| Unlock Time | Guidance |
|-------------|----------|
| < 500 ms | Strong protection (recommended) |
| 500–1000 ms | Very strong protection |
| 1000–2000 ms | Maximum protection (slower unlock) |
| > 2000 ms | May feel sluggish on this device |

Changing parameters **re-encrypts the entire vault** with a newly derived key. Your master password and vault salt do not change.

### 10.3 Appearance Settings

| Setting | Options | Default |
|---------|---------|---------|
| **Theme** | System, Dark, Light | System |
| **Locale** | English (more coming) | English |

### 10.4 Default Generator Settings

Configure the default values for the password generator:

- Password length and character sets
- Passphrase word count and separator
- These defaults are used whenever you open the generator or click the dice icon on a password field.

---

## 11. Security Best Practices

### 11.1 Master Password

- Use a **strong, unique** master password that you do not use anywhere else.
- **12+ characters** minimum. A passphrase of 4–6 random words is both strong and memorable.
- **Never share** your master password with anyone — including Khurklockd support (we will never ask for it).
- If you must write it down, store it in a **secure physical location** (safe, safety deposit box).
- Consider using the **emergency access** feature as a backup for loved ones.

### 11.2 Vault File

- **Back up** your `.khurklockd` file regularly to a separate device or location.
- If syncing via cloud storage, the file is always encrypted — the provider cannot read it.
- **Do not** store plaintext exports alongside your encrypted vault.
- Use a **dedicated directory** for your vault file so you always know where it lives.

### 11.3 Passwords

- Use the **password generator** to create unique passwords for every account.
- **Never reuse passwords.** If one site is breached, reused passwords put other accounts at risk.
- Enable **two-factor authentication (2FA)** on every account that supports it.
- Use the **breach monitor** periodically to check for compromised accounts.

### 11.4 Device Security

- Keep your **browser and operating system updated**.
- Use a **screen lock** on your device.
- Be cautious with **browser extensions** — they can read DOM content.
- Lock Khurklockd when stepping away from your computer (`Cmd+Shift+L` / `Ctrl+Shift+L`).

### 11.5 Clipboard

- The clipboard is automatically cleared after the configured delay.
- Avoid pasting passwords into insecure contexts (public computers, shared screens).
- Prefer using the **copy button** in Khurklockd (which respects the clipboard clear timer) over manual copy.

---

## 12. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+L` / `Cmd+Shift+L` | Lock vault immediately |
| `/` | Focus search bar |
| `Ctrl+N` / `Cmd+N` | New item |
| `Ctrl+S` / `Cmd+S` | Save current item |
| `Escape` | Close modal / cancel editing |
| `j` | Move to next item in list |
| `k` | Move to previous item in list |
| `Enter` | Open selected item |
| `Ctrl+C` / `Cmd+C` | Copy selected field (when focused) |
| `Ctrl+F` / `Cmd+F` | Focus search bar |
| `Tab` | Move to next field |
| `Shift+Tab` | Move to previous field |

### 12.1 Item List Navigation

- **`j`** and **`k`** move the selection highlight up and down the item list.
- **`Enter`** opens the currently highlighted item.
- **`/`** focuses the search bar from anywhere in the vault.

### 12.2 Editor Shortcuts

- **`Ctrl+S`** / **`Cmd+S`** saves the current item being edited.
- **`Escape`** cancels editing and returns to the item detail view (discarding unsaved changes).

---

## 13. FAQ

### General

**Q: Is Khurklockd free?**
A: Yes. The free tier includes all features: unlimited items, password generator, TOTP, breach monitoring, and digital wallet. A Pro tier ($3/month) adds emergency access and priority support.

**Q: Where is my data stored?**
A: In a `.khurklockd` file on your device. It is never uploaded to any server. If you sync via Dropbox, Google Drive, or iCloud, only encrypted ciphertext is stored.

**Q: Can Khurklockd see my passwords?**
A: No. All encryption and decryption happens in your browser. No plaintext, master password, or encryption key ever leaves your device.

**Q: Does Khurklockd work offline?**
A: Yes. The vault is a local file. All features (except breach monitoring, which requires the HIBP API) work fully offline.

### Vault

**Q: What if I forget my master password?**
A: Your data is unrecoverable. There is no backdoor, no reset mechanism, no recovery key. This is by design — it means no one else can recover it either.

**Q: Can I change my master password?**
A: Yes. Go to Settings > Security > Change Master Password. The vault is re-encrypted with a key derived from your new password. The vault salt does not change.

**Q: Can I have multiple vaults?**
A: Yes. Each vault is a separate `.khurklockd` file. Open whichever one you need. You cannot merge vaults directly (planned for a future release).

**Q: How big can my vault get?**
A: There is no hard limit. Vaults over 50 MB may perform slower on lower-end devices. A typical vault with 1,000 items is around 500 KB.

**Q: Can I share items with someone else?**
A: Item sharing is planned for Phase 3. It will use end-to-end encryption so shared items are only readable by the intended recipient.

### Security

**Q: What encryption does Khurklockd use?**
A: AES-256-GCM for encryption, Argon2id for key derivation, and HMAC-SHA256 for integrity verification. See [SECURITY.md](../SECURITY.md) for full details.

**Q: What if someone steals my .khurklockd file?**
A: Without your master password, the file is useless. Argon2id (64 MiB memory, 3 iterations) makes GPU brute-force attacks infeasible. However, a weak master password is still vulnerable — use a strong one.

**Q: Is the browser extension safe?**
A: The browser extension (planned for Phase 3) will communicate with the web app via `postMessage` and will not have access to your master password. It will only fill credentials into pages on your command.

**Q: Has Khurklockd been audited?**
A: Not yet. A third-party security audit is planned after Phase 3. In the meantime, the cryptographic code paths are documented in the [Architecture Document](ARCHITECTURE.md) and self-reviewed.

### Import / Export

**Q: Can I import from 1Password / LastPass / Bitwarden / Dashlane?**
A: Yes. See [Importing Passwords](#6-importing-passwords) for supported formats and instructions.

**Q: Can I export my vault?**
A: Yes, to encrypted JSON, plain JSON, or CSV. Plaintext exports are unencrypted — handle them with care.

**Q: Will importing create duplicates?**
A: Duplicates are not automatically detected. Review the import preview carefully and deselect any entries you already have.

### TOTP

**Q: Do I still need Google Authenticator?**
A: No. Khurklockd's built-in TOTP replaces standalone authenticator apps. All your codes are stored in your encrypted vault alongside your passwords.

**Q: Can I scan QR codes for TOTP setup?**
A: Yes. When editing a login item, click the QR scanner button in the TOTP Secret field to scan the setup code with your camera.

**Q: What if my device clock is wrong?**
A: TOTP codes depend on accurate time. Khurklockd tolerates ±1 time step (30 seconds) of clock skew. If your device clock is significantly off, TOTP codes will not validate correctly.

### Breach Monitoring

**Q: Does breach monitoring send my email to a server?**
A: No. Khurklockd uses HIBP's k-anonymity model. Only the first 5 characters of a SHA-1 hash of your email are sent. Full email addresses are never transmitted.

**Q: How often should I scan?**
A: Manual scans can be done whenever you like. Pro tier users get automatic weekly background scans.

**Q: What should I do if I find a breach?**
A: Change the password for the affected account immediately, enable 2FA, and check any other accounts that share that password.

---

## Additional Resources

| Resource | Location |
|----------|----------|
| Architecture Document | [docs/ARCHITECTURE.md](ARCHITECTURE.md) |
| Security Policy | [SECURITY.md](../SECURITY.md) |
| GitHub Repository | [github.com/skulls206-creator/khurklockd](https://github.com/skulls206-creator/khurklockd) |
| Live Demo | [skulls206-creator.github.io/khurklockd](https://skulls206-creator.github.io/khurklockd/) |

---

Khurklockd is built on the principle that you should not have to trust anyone with your secrets. Your vault is yours — always.
