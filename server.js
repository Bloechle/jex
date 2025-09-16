import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import debug from 'debug';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const log = debug('jex:server');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('combined'));
app.use(cors());

// Serve static files from current directory
app.use(express.static(__dirname));

// Default route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Jex Framework',
        version: '2025.07.02',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Jex Framework server running at http://localhost:${PORT}`);
    log(`Server started on port ${PORT}`);
});

export default app;