import express from 'express';
import routes from './routes/emailRoute';
const rateLimit = require("express-rate-limit");
const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
});

app.use(limiter);
app.use(express.json());
app.use(routes);

module.exports = app;
