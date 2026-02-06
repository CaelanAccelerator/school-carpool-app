"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Campus Carpool App' });
});
/* GET API health check */
router.get('/health', function (req, res) {
    res.json({
        success: true,
        message: 'Campus Carpool API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
/* GET API info */
router.get('/api', function (req, res) {
    res.json({
        success: true,
        data: {
            name: 'Campus Carpool API',
            version: '1.0.0',
            endpoints: {
                users: '/api/users',
                schedule: '/api/schedule',
                matching: '/api/matching',
                health: '/health'
            },
            documentation: 'See README.md for full API documentation'
        }
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map