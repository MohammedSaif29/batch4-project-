const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Change in production
const TOKEN_EXPIRY = '24h';

// Generate JWT token for authenticated user
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
}

// Verify user credentials and return token
async function authenticate(username, password) {
    // require queries lazily to avoid circular dependency at module load time
    const { queries } = require('./db');

    const user = queries.getUserByUsername.get(username);
    if (!user) {
        throw new Error('User not found');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        throw new Error('Invalid password');
    }

    const token = generateToken(user);
    return {
        token,
        user: {
            id: user.id,
            username: user.username,
            role: user.role
        }
    };
}

// Middleware to protect admin routes
function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: 'No authorization header'
        });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
}

module.exports = {
    authenticate,
    requireAdmin,
    generateToken
};