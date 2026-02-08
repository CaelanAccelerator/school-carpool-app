"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const http_errors_1 = __importDefault(require("http-errors"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const middleware_1 = require("./middleware");
const geo_1 = __importDefault(require("./routes/geo"));
const index_1 = __importDefault(require("./routes/index"));
const matching_1 = __importDefault(require("./routes/matching"));
const schedule_1 = __importDefault(require("./routes/schedule"));
const users_1 = __importDefault(require("./routes/users"));
const app = (0, express_1.default)();
// view engine setup
app.set('views', path_1.default.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use((0, morgan_1.default)('dev'));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(middleware_1.requestLogger);
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// Routes
app.use('/', index_1.default);
app.use('/api/users', users_1.default);
app.use('/api', schedule_1.default);
app.use('/api/matching', matching_1.default);
app.use('/api/geo', geo_1.default);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next((0, http_errors_1.default)(404));
});
// Global error handler
app.use(middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map