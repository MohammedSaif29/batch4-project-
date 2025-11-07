const path = require('path');
const express = require('express');
const cors = require('cors');
const { db, queries, initialize } = require('./db');
const { authenticate, requireAdmin } = require('./auth');

const app = express();
const port = process.env.PORT || 3000;

// Initialize database
initialize().catch(console.error);

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static files (index.html is in the same directory)
const staticDir = path.join(__dirname);
app.use(express.static(staticDir));

// Auth endpoint
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password required'
        });
    }

    try {
        const result = await authenticate(username, password);
        res.json({
            success: true,
            ...result
        });
    } catch (err) {
        res.status(401).json({
            success: false,
            message: err.message
        });
    }
});

// Public API endpoints
app.get('/api/requests', (req, res) => {
    try {
        const requests = queries.getAllRequests.all();
        res.json({ success: true, data: requests });
    } catch (err) {
        console.error('Error fetching requests:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching requests'
        });
    }
});

app.get('/api/requests/:id', (req, res) => {
    try {
        const request = queries.getRequestById.get(req.params.id);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }
        res.json({ success: true, data: request });
    } catch (err) {
        console.error('Error fetching request:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching request'
        });
    }
});

app.post('/api/donate', (req, res) => {
    const { requestId, donorName, amount, description } = req.body;
    if (!amount || !donorName) {
        return res.status(400).json({
            success: false,
            message: 'amount and donorName are required'
        });
    }

    try {
        db.transaction(() => {
            // Create a new pending request
            const result = queries.insertRequest.run(
                `Donation from ${donorName}`, // title
                description || `A donation of ₹${amount} from ${donorName}`, // description
                '', // location
                amount, // amountNeeded
                'Medium', // priority
                donorName // submittedBy
            );

            const newRequestId = result.lastInsertRowid;

            // Create the donation record
            queries.insertDonation.run(
                newRequestId,
                donorName,
                amount
            );

            // Set request status to pending for admin approval
            queries.updateRequestStatus.run('pending', newRequestId);
        })();

        res.json({
            success: true,
            message: 'Donation submitted for approval'
        });
    } catch (err) {
        console.error('Error processing donation:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// Protected admin endpoints
app.get('/api/admin/requests/pending', requireAdmin, (req, res) => {
    try {
        const requests = queries.getPendingRequests.all();
        res.json({ success: true, data: requests });
    } catch (err) {
        console.error('Error fetching pending requests:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending requests'
        });
    }
});

app.patch('/api/requests/:id', requireAdmin, (req, res) => {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status'
        });
    }

    try {
        const id = Number(req.params.id);
        queries.updateRequestStatus.run(status, id);
        const updated = queries.getRequestById.get(id);
        res.json({ success: true, data: updated });
    } catch (err) {
        console.error('Error updating request:', err);
        res.status(500).json({
            success: false,
            message: 'Error updating request'
        });
    }
});

app.get('/api/admin/donations', requireAdmin, (req, res) => {
    try {
        const donations = queries.getAllDonations.all();
        res.json({ success: true, data: donations });
    } catch (err) {
        console.error('Error fetching donations:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching donations'
        });
    }
});

// New request submission (could be protected for recipients later)
app.post('/api/requests', (req, res) => {
    const { title, description, location, amountNeeded, priority, submittedBy } = req.body;
    
    if (!title || !description || !amountNeeded || !submittedBy) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields'
        });
    }

    try {
        const result = queries.insertRequest.run(
            title,
            description,
            location || '',
            amountNeeded,
            priority || 'Medium',
            submittedBy
        );

        const newRequest = queries.getRequestById.get(result.lastInsertRowid);
        res.json({ success: true, data: newRequest });
    } catch (err) {
        console.error('Error creating request:', err);
        res.status(500).json({
            success: false,
            message: 'Error creating request'
        });
    }
});

// Fallback: serve index.html for any other route (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(port, () => {
    console.log(`AidConnect server listening on http://localhost:${port}`);
});
