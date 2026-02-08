import { expect } from 'chai';
import { CAMPUS_NAMES, getCampusCoords } from '../../lib/config/campusCoords';

describe('Campus Validation', () => {
  describe('getCampusCoords', () => {
    it('should return coordinates for valid campuses', () => {
      const mainCoords = getCampusCoords('Main Campus');
      expect(mainCoords).to.deep.equal({ lat: 49.2606, lng: -123.2460 });

      const ubcCoords = getCampusCoords('UBC Campus');
      expect(ubcCoords).to.deep.equal({ lat: 49.2606, lng: -123.2460 });

      const northCoords = getCampusCoords('North Campus');
      expect(northCoords).to.deep.equal({ lat: 49.3050, lng: -123.1440 });
    });

    it('should throw error for invalid campus', () => {
      expect(() => getCampusCoords('Invalid Campus')).to.throw('UNKNOWN_CAMPUS:Invalid Campus');
      expect(() => getCampusCoords('Nonexistent Campus')).to.throw('UNKNOWN_CAMPUS:Nonexistent Campus');
      expect(() => getCampusCoords('')).to.throw('UNKNOWN_CAMPUS:');
    });

    it('should be case sensitive', () => {
      expect(() => getCampusCoords('main campus')).to.throw('UNKNOWN_CAMPUS:main campus');
      expect(() => getCampusCoords('MAIN CAMPUS')).to.throw('UNKNOWN_CAMPUS:MAIN CAMPUS');
    });
  });

  describe('CAMPUS_NAMES', () => {
    it('should contain all valid campus names', () => {
      expect(CAMPUS_NAMES).to.have.length(3);
      expect(CAMPUS_NAMES).to.include('Main Campus');
      expect(CAMPUS_NAMES).to.include('UBC Campus');
      expect(CAMPUS_NAMES).to.include('North Campus');
    });

    it('should match available coordinates', () => {
      CAMPUS_NAMES.forEach(campus => {
        expect(() => getCampusCoords(campus)).to.not.throw();
      });
    });
  });
});