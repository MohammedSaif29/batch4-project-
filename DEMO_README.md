# Demo instructions — AidConnect

This file contains a short one-click demo and the temporary admin password set for the demo.

Admin credentials (demo only)
- Username: admin
- Password: S3cure-Demo-2025!

Important: change this password after the demo. Do not commit production credentials.

One-click demo
1. Double-click or run `start-demo.ps1` in the project root. This will open a new PowerShell window that runs the server and open your default browser to the app.

Manual steps
1. Open PowerShell and cd to the project folder:

```powershell
cd "C:\Users\Asus\OneDrive\project\Donation\Main functoning appp"
```

2. (Optional) Set the admin password (the script below was run automatically by the maintainer):

```powershell
node scripts/set-admin-password.js "S3cure-Demo-2025!"
```

3. Start the server and keep the terminal open while demoing:

```powershell
node server.js
```

4. Open http://localhost:3000 in the browser (the start-demo script will open it automatically).

Demo checklist
- [ ] Start server (node server.js or use start-demo.ps1)
- [ ] Open browser to http://localhost:3000
- [ ] Click Login → Admin and sign in with the demo credentials
- [ ] Approve/Reject a pending request
- [ ] Show donor flow: Login → Donor → Donate

Notes
- The demo uses a local SQLite DB file (`aidconnect.db`) located in the project root.
- The admin password is for demonstration — change it after you finish.
