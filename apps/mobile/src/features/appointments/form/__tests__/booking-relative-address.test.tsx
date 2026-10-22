import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { fetchPatientRelative, fetchPatientRelatives } from '@/features/patient-relatives/api/patient-relatives.service';
import { fetchUser, updateUser } from '@/features/profile/api/profile.service';
import { updatePatient } from '@/features/patients/api/patients.service';
import { useAuthStore } from '@/store/auth-store';
import { useBookingWizard } from '../hooks/useBookingWizard';
import type { AddressPayload } from '../types';
import type { BookingDraftData } from '../utils/booking-draft';

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
jest.mock('@/providers/ToastProvider', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('@/features/patient-relatives/api/patient-relatives.service', () => ({
  fetchPatientRelatives: jest.fn(),
  fetchPatientRelative: jest.fn(),
}));
jest.mock('@/features/profile/api/profile.service', () => ({
  fetchUser: jest.fn(),
  updateUser: jest.fn(),
}));
jest.mock('@/features/patients/api/patients.service', () => ({
  updatePatient: jest.fn(),
  createPatient: jest.fn(),
  adoptStaffPatient: jest.fn(),
}));
jest.mock('@/features/patients/api/fetch-all-patients', () => ({ fetchAllPatients: jest.fn(async () => []) }));
jest.mock('@/features/categories/api/categories.service', () => ({
  fetchCareCategories: jest.fn(async () => ({ success: true, data: [] })),
  fetchCareCategoryOptions: jest.fn(async () => ({ success: true, data: [] })),
}));
jest.mock('@/features/patients/api/linked-nurses.service', () => ({ fetchLinkedNurses: jest.fn() }));
jest.mock('@/features/appointments/api/lab-brands.service', () => ({ fetchPublicLabBrands: jest.fn(async () => []) }));
jest.mock('@/features/appointments/api/create-multiple-appointments', () => ({ createMultipleAppointments: jest.fn() }));
jest.mock('@/features/appointments/api/booking-draft.service', () => ({ createPatientBookingDraft: jest.fn() }));
jest.mock('../hooks/use-patient-vip-iap', () => ({ usePatientVipIap: () => ({}) }));
jest.mock('../hooks/useWizardProfileDocuments', () => ({ useWizardProfileDocuments: () => ({ data: undefined }) }));
jest.mock('@/utils/patient-address-rdv', () => {
  const parse = (raw: unknown) =>
    raw && typeof raw === 'object' && 'label' in raw ? (raw as { label: string; lat: number; lng: number; complement?: string }) : null;
  return {
    parseRawPatientAddress: parse,
    resolvePatientAddressForRdvForm: async (raw: unknown) => parse(raw),
  };
});

const RELATIVE_ADDRESS = { label: '1 rue du Proche, Lyon', lat: 45.1, lng: 4.1, complement: 'Bât A' };
const HOLDER_ADDRESS = { label: '9 avenue du Titulaire, Paris', lat: 48.8, lng: 2.3 };
const CHOSEN: AddressPayload = { label: '5 place du RDV, Nice', lat: 43.7, lng: 7.2 };

const relative = {
  id: 'rel-1',
  first_name: 'Léa',
  last_name: 'Proche',
  gender: 'female',
  birth_date: '2015-02-03',
  address: RELATIVE_ADDRESS,
};

type Wizard = ReturnType<typeof useBookingWizard>;
let current: Wizard | null = null;
let mounted: ReactTestRenderer | null = null;
let client: QueryClient;

function Harness(props: Parameters<typeof useBookingWizard>[0]) {
  current = useBookingWizard(props);
  return null;
}

function bw(): Wizard {
  if (!current) throw new Error('Hook non monté');
  return current;
}

async function mount(props: Parameters<typeof useBookingWizard>[0]) {
  await act(async () => {
    mounted = renderer.create(
      <QueryClientProvider client={client}>
        <Harness {...props} />
      </QueryClientProvider>,
    );
  });
  await flush();
}

async function flush() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
}

/** Provoque plusieurs rendus du tunnel (ex. retour sur l'étape, refetch). */
async function rerenderWizard() {
  await act(async () => {
    bw().setConsent(true);
  });
  await act(async () => {
    bw().setConsent(false);
  });
  await flush();
}

function address() {
  return bw().wizard.form.getValues('address');
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  current = null;
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({
    user: { id: 'holder-1', role: 'patient', first_name: 'Marc', last_name: 'Titulaire', email: 'm@test.local' },
  } as never);
  jest.mocked(fetchPatientRelatives).mockResolvedValue({ success: true, data: [relative] } as never);
  jest.mocked(fetchPatientRelative).mockResolvedValue({ success: true, data: relative } as never);
  jest.mocked(fetchUser).mockResolvedValue({
    success: true,
    data: { id: 'holder-1', first_name: 'Marc', last_name: 'Titulaire', address: HOLDER_ADDRESS },
  } as never);
  jest.mocked(updateUser).mockResolvedValue({ success: true } as never);
  jest.mocked(updatePatient).mockResolvedValue({ success: true } as never);
});

afterEach(() => {
  act(() => mounted?.unmount());
  mounted = null;
  client.clear();
  jest.useRealTimers();
});

describe('adresse d’un RDV pour un proche (mobile)', () => {
  it('propose l’adresse du proche puis garde l’adresse choisie malgré les rendus suivants', async () => {
    await mount({ mode: 'patient', role: 'patient', basePath: '/patient' as never, initialRelativeId: 'rel-1' });
    expect(address()?.label).toBe(RELATIVE_ADDRESS.label);

    await act(async () => {
      bw().wizard.onAddressChange(CHOSEN);
    });
    await rerenderWizard();

    expect(address()).toEqual(CHOSEN);
    expect(updateUser).not.toHaveBeenCalled();
    expect(updatePatient).not.toHaveBeenCalled();
  });

  it('une adresse effacée reste vide', async () => {
    await mount({ mode: 'patient', role: 'patient', basePath: '/patient' as never, initialRelativeId: 'rel-1' });
    await act(async () => {
      bw().wizard.onAddressChange(null);
    });
    await rerenderWizard();

    expect(address()).toBeNull();
  });

  it('un brouillon repris garde son adresse au lieu de celle du proche', async () => {
    const draft: BookingDraftData = {
      step: 0,
      wizardIndex: 0,
      selectedServices: [],
      formDataByService: {},
      patient: {
        first_name: 'Léa', last_name: 'Proche', email: '', phone: '', gender: 'female',
        birth_date: '2015-02-03', address: CHOSEN,
      },
      addressComplement: '',
      selectedPatientId: '',
      patientMode: 'existing',
      selectedRelativeId: 'rel-1',
      labPreferenceMode: 'platform_match',
      preferredLabBrandId: null,
      nurseAssignmentMode: 'cary_dispatch',
      proLinkedNurseId: '',
      externalNursePhone: '',
    };
    await mount({ mode: 'patient', role: 'patient', basePath: '/patient' as never, initialDraft: draft });
    await rerenderWizard();

    expect(address()).toEqual(CHOSEN);
  });

  it('côté soignant, l’adresse du proche ou saisie n’est jamais écrite dans le dossier du titulaire', async () => {
    useAuthStore.setState({ user: { id: 'nurse-1', role: 'nurse' } } as never);
    jest.mocked(fetchUser).mockResolvedValue({
      success: true,
      data: { id: 'holder-1', first_name: 'Marc', last_name: 'Titulaire', address: HOLDER_ADDRESS },
    } as never);
    await mount({ mode: 'dashboard', role: 'nurse', basePath: '/nurse' as never, initialPatientId: 'holder-1' });
    expect(address()?.label).toBe(HOLDER_ADDRESS.label);

    await act(async () => {
      bw().setSelectedRelativeId('rel-1');
    });
    await flush();
    expect(address()?.label).toBe(RELATIVE_ADDRESS.label);

    await act(async () => {
      bw().wizard.onAddressChange(CHOSEN);
    });
    await flush();

    expect(address()).toEqual(CHOSEN);
    expect(updatePatient).not.toHaveBeenCalled();
  });
});
