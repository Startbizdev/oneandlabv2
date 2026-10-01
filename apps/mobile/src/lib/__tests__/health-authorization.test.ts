import { requestDeviceHealthAuthorization } from '@/features/health-sync/native/health-authorization';

const mockInitialize = jest.fn<Promise<boolean>, []>();
const mockRequestPermission = jest.fn<
  Promise<Array<{ accessType: string; recordType: string }>>,
  [Array<{ accessType: string; recordType: string }>]
>();

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('react-native-health-connect', () => ({
  initialize: () => mockInitialize(),
  requestPermission: (permissions: Array<{ accessType: string; recordType: string }>) =>
    mockRequestPermission(permissions),
}));

describe('requestDeviceHealthAuthorization (Android)', () => {
  beforeEach(() => {
    mockInitialize.mockResolvedValue(true);
    mockRequestPermission.mockReset();
  });

  it('échoue quand l’utilisateur refuse toutes les lectures', async () => {
    mockRequestPermission.mockResolvedValue([]);
    const result = await requestDeviceHealthAuthorization();
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Autorisez Cary/);
  });

  it('renvoie uniquement les types de lecture accordés', async () => {
    mockRequestPermission.mockResolvedValue([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'write', recordType: 'Weight' },
    ]);
    const result = await requestDeviceHealthAuthorization();
    expect(result).toEqual({ ok: true, grantedRecordTypes: ['Steps'] });
  });

  it('échoue si Health Connect n’est pas disponible', async () => {
    mockInitialize.mockResolvedValue(false);
    const result = await requestDeviceHealthAuthorization();
    expect(result.ok).toBe(false);
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });
});
