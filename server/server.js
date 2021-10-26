const express = require('express');
const auth = require('./authService');

require('dotenv').config()

const app = express();

app.use('/', express.static(`${__dirname}/../client`));
const authSvc = new auth.AuthService({
    consumerKey: process.env.FORGE_CLIENT_ID,
    consumerSecret: process.env.FORGE_CLIENT_SECRET,
});

app.use('/api/auth', authSvc.router);
const port = process.env.PORT || 5000;

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', reason.stack || reason);
    // Recommended: send the information to sentry.io
    // or whatever crash reporting service you use
});

app.set('port', port);
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

// TODO: Add Socket.IO elements
// TODO: Mock telemetry data