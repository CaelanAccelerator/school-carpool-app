"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAMPUS_NAMES = exports.CAMPUS_COORDS = void 0;
exports.getCampusCoords = getCampusCoords;
exports.CAMPUS_COORDS = {
    'Main Campus': { lat: 49.2606, lng: -123.2460 },
    'UBC Campus': { lat: 49.2606, lng: -123.2460 },
    'North Campus': { lat: 49.3050, lng: -123.1440 }
};
exports.CAMPUS_NAMES = Object.keys(exports.CAMPUS_COORDS);
function getCampusCoords(campus) {
    const coords = exports.CAMPUS_COORDS[campus];
    if (!coords) {
        throw new Error(`UNKNOWN_CAMPUS:${campus}`);
    }
    return coords;
}
//# sourceMappingURL=campusCoords.js.map