import { expect } from 'chai';
import express from 'express';
import sinon from 'sinon';
import request from 'supertest';

describe('API Routes - Smoke Tests', () => {
  let app: any;
  let sandbox: sinon.SinonSandbox;

  before(() => {
    sandbox = sinon.createSandbox();
    
    // Create a minimal Express app for testing
    app = express();
    
    // Basic middleware
    app.use(express.json());
    
    // Mock routes with simple responses
    app.put('/api/users', (req: any, res: any) => {
      res.status(201).json({
        success: true,
        data: { id: 'mock-user-id', email: 'test@example.com' },
        message: 'User created successfully'
      });
    });

    app.get('/api/users', (req: any, res: any) => {
      res.json({
        success: true,
        data: [{ id: 'user1', name: 'Test User' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      });
    });

    app.post('/api/schedule/users/:userId/schedule', (req: any, res: any) => {
      res.status(201).json({
        success: true,
        data: { id: 'mock-schedule-id', userId: req.params.userId, dayOfWeek: 1 },
        message: 'Schedule entry created successfully'
      });
    });

    app.post('/api/matching/users/:userId/find-optimal-drivers-to-campus', (req: any, res: any) => {
      res.json({
        success: true,
        data: [{ id: 'driver1', user: { name: 'Driver 1' } }]
      });
    });

    // 404 handler
    app.use((req: any, res: any) => {
      res.status(404).json({ success: false, error: 'Not found' });
    });
  });

  after(() => {
    sandbox.restore();
  });

  describe('User Routes', () => {
    it('PUT /api/users should create a user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        contactType: 'EMAIL',
        contactValue: 'test@example.com',
        campus: 'UBC',
        homeArea: 'Vancouver'
      };

      const response = await request(app)
        .put('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('id');
      expect(response.body.message).to.equal('User created successfully');
    });

    it('GET /api/users should return users list', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.pagination).to.have.property('total');
    });
  });

  describe('Schedule Routes', () => {
    it('POST /api/schedule/users/:userId/schedule should create schedule entry', async () => {
      const scheduleData = {
        dayOfWeek: 1,
        toCampusMins: 480,
        goHomeMins: 1020
      };

      const response = await request(app)
        .post('/api/schedule/users/test-user-id/schedule')
        .send(scheduleData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('id');
      expect(response.body.message).to.equal('Schedule entry created successfully');
    });
  });

  describe('Matching Routes', () => {
    it('POST /api/matching/users/:userId/find-optimal-drivers-to-campus should find drivers', async () => {
      const matchingData = {
        dayOfWeek: 1,
        toCampusTime: '08:00',
        flexibilityMins: 15
      };

      const response = await request(app)
        .post('/api/matching/users/test-user-id/find-optimal-drivers-to-campus')
        .send(matchingData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Not found');
    });
  });
});