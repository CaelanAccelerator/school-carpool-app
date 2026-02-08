"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const MockGeoProvider_1 = require("../lib/geo/MockGeoProvider");
const router = express_1.default.Router();
const provider = new MockGeoProvider_1.MockGeoProvider();
router.get('/autocomplete', async (req, res) => {
    const queryParam = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
    const q = typeof queryParam === 'string' ? queryParam.trim() : '';
    if (!q) {
        res.status(400).json({
            success: false,
            message: 'Query parameter "q" is required'
        });
        return;
    }
    const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = limitParam ? parseInt(String(limitParam), 10) : undefined;
    const results = await provider.autocomplete(q, limit);
    res.json({
        success: true,
        data: results
    });
});
router.get('/place/:placeId', async (req, res) => {
    const placeId = Array.isArray(req.params.placeId)
        ? req.params.placeId[0]
        : req.params.placeId;
    if (!placeId) {
        res.status(400).json({
            success: false,
            message: 'placeId is required'
        });
        return;
    }
    try {
        const details = await provider.placeDetails(placeId);
        res.json({
            success: true,
            data: details
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'NOT_FOUND') {
            res.status(404).json({
                success: false,
                message: 'Place not found'
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Failed to fetch place details'
        });
    }
});
router.get('/duration', async (req, res) => {
    const oLat = Array.isArray(req.query.oLat) ? req.query.oLat[0] : req.query.oLat;
    const oLng = Array.isArray(req.query.oLng) ? req.query.oLng[0] : req.query.oLng;
    const dLat = Array.isArray(req.query.dLat) ? req.query.dLat[0] : req.query.dLat;
    const dLng = Array.isArray(req.query.dLng) ? req.query.dLng[0] : req.query.dLng;
    const originLat = parseFloat(String(oLat));
    const originLng = parseFloat(String(oLng));
    const destLat = parseFloat(String(dLat));
    const destLng = parseFloat(String(dLng));
    if (Number.isNaN(originLat) ||
        Number.isNaN(originLng) ||
        Number.isNaN(destLat) ||
        Number.isNaN(destLng)) {
        res.status(400).json({
            success: false,
            message: 'oLat, oLng, dLat, dLng are required and must be numbers'
        });
        return;
    }
    try {
        const durationMins = await provider.routeDurationMins({ lat: originLat, lng: originLng }, { lat: destLat, lng: destLng });
        res.json({
            success: true,
            data: { durationMins }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to calculate duration'
        });
    }
});
router.get('/detour', async (req, res) => {
    const oLat = Array.isArray(req.query.oLat) ? req.query.oLat[0] : req.query.oLat;
    const oLng = Array.isArray(req.query.oLng) ? req.query.oLng[0] : req.query.oLng;
    const wLat = Array.isArray(req.query.wLat) ? req.query.wLat[0] : req.query.wLat;
    const wLng = Array.isArray(req.query.wLng) ? req.query.wLng[0] : req.query.wLng;
    const dLat = Array.isArray(req.query.dLat) ? req.query.dLat[0] : req.query.dLat;
    const dLng = Array.isArray(req.query.dLng) ? req.query.dLng[0] : req.query.dLng;
    const originLat = parseFloat(String(oLat));
    const originLng = parseFloat(String(oLng));
    const waypointLat = parseFloat(String(wLat));
    const waypointLng = parseFloat(String(wLng));
    const destLat = parseFloat(String(dLat));
    const destLng = parseFloat(String(dLng));
    if (Number.isNaN(originLat) ||
        Number.isNaN(originLng) ||
        Number.isNaN(waypointLat) ||
        Number.isNaN(waypointLng) ||
        Number.isNaN(destLat) ||
        Number.isNaN(destLng)) {
        res.status(400).json({
            success: false,
            message: 'oLat, oLng, wLat, wLng, dLat, dLng are required and must be numbers'
        });
        return;
    }
    try {
        const result = await provider.detourExtraMins({ lat: originLat, lng: originLng }, { lat: waypointLat, lng: waypointLng }, { lat: destLat, lng: destLng });
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to calculate detour'
        });
    }
});
exports.default = router;
//# sourceMappingURL=geo.js.map