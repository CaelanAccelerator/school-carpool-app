import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import createError from 'http-errors';
import logger from 'morgan';
import path from 'path';
import { errorHandler, requestLogger } from './middleware';
import authRouter from './routes/auth';
import indexRouter from './routes/index';
import matchingRouter from './routes/matching';
import rideRequestsRouter from './routes/rideRequests';
import scheduleRouter from './routes/schedule';
import usersRouter from './routes/users';

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', indexRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api', scheduleRouter);
app.use('/api/matching', matchingRouter);
app.use('/api/requests', rideRequestsRouter);

// catch 404 and forward to error handler
app.use(function(req: Request, res: Response, next: NextFunction) {
  next(createError(404));
});

// Global error handler
app.use(errorHandler);

export default app;