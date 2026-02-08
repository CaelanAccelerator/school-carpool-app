"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const campusCoords_1 = require("../../lib/config/campusCoords");
describe('Campus Validation', () => {
    describe('getCampusCoords', () => {
        it('should return coordinates for valid campuses', () => {
            const mainCoords = (0, campusCoords_1.getCampusCoords)('Main Campus');
            (0, chai_1.expect)(mainCoords).to.deep.equal({ lat: 49.2606, lng: -123.2460 });
            const ubcCoords = (0, campusCoords_1.getCampusCoords)('UBC Campus');
            (0, chai_1.expect)(ubcCoords).to.deep.equal({ lat: 49.2606, lng: -123.2460 });
            const northCoords = (0, campusCoords_1.getCampusCoords)('North Campus');
            (0, chai_1.expect)(northCoords).to.deep.equal({ lat: 49.3050, lng: -123.1440 });
        });
        it('should throw error for invalid campus', () => {
            (0, chai_1.expect)(() => (0, campusCoords_1.getCampusCoords)('Invalid Campus')).to.throw('UNKNOWN_CAMPUS:Invalid Campus');
            (0, chai_1.expect)(() => (0, campusCoords_1.getCampusCoords)('Nonexistent Campus')).to.throw('UNKNOWN_CAMPUS:Nonexistent Campus');
            (0, chai_1.expect)(() => (0, campusCoords_1.getCampusCoords)('')).to.throw('UNKNOWN_CAMPUS:');
        });
        it('should be case sensitive', () => {
            (0, chai_1.expect)(() => (0, campusCoords_1.getCampusCoords)('main campus')).to.throw('UNKNOWN_CAMPUS:main campus');
            (0, chai_1.expect)(() => (0, campusCoords_1.getCampusCoords)('MAIN CAMPUS')).to.throw('UNKNOWN_CAMPUS:MAIN CAMPUS');
        });
    });
    describe('CAMPUS_NAMES', () => {
        it('should contain all valid campus names', () => {
            (0, chai_1.expect)(campusCoords_1.CAMPUS_NAMES).to.have.length(3);
            (0, chai_1.expect)(campusCoords_1.CAMPUS_NAMES).to.include('Main Campus');
            (0, chai_1.expect)(campusCoords_1.CAMPUS_NAMES).to.include('UBC Campus');
            (0, chai_1.expect)(campusCoords_1.CAMPUS_NAMES).to.include('North Campus');
        });
        it('should match available coordinates', () => {
            campusCoords_1.CAMPUS_NAMES.forEach(campus => {
                (0, chai_1.expect)(() => (0, campusCoords_1.getCampusCoords)(campus)).to.not.throw();
            });
        });
    });
});
//# sourceMappingURL=campusValidation.test.js.map