import Boom = require('boom');
import * as express from 'express';
import httpResponse from '../utilities/http-response';
const router = express.Router();

router.get('/a', (req, res, next) => {
    next(httpResponse.Ok());
});

router.get('/b', (req, res, next) => {
    next(new Error('tomtom'));
});

router.get('/c', (req, res, next) => {
    next(Boom.badRequest('asdf'));
});

export default router;