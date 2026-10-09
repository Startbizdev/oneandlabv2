import { patientDraftFromContact } from '../contacts/patient-draft-from-contact';

describe('patientDraftFromContact', () => {
  it('prefills names, mobile number, primary email and a one-line address', () => {
    const draft = patientDraftFromContact({
      name: 'Jeanne Martin',
      firstName: 'Jeanne',
      lastName: 'Martin',
      phoneNumbers: [
        { label: 'domicile', number: '04 91 00 00 00' },
        { label: 'mobile', number: '06 12 34 56 78' },
      ],
      emails: [
        { label: 'travail', email: 'j.martin@work.test' },
        { label: 'perso', email: 'jeanne@perso.test', isPrimary: true },
      ],
      addresses: [{ label: 'domicile', street: '12 rue Paul Claudel\nBât. B', postalCode: '13003', city: 'Marseille' }],
    });

    expect(draft).toEqual({
      firstName: 'Jeanne',
      lastName: 'Martin',
      phone: '06 12 34 56 78',
      email: 'jeanne@perso.test',
      addressQuery: '12 rue Paul Claudel, Bât. B, 13003 Marseille',
    });
  });

  it('splits the display name when given and family names are missing', () => {
    expect(patientDraftFromContact({ name: 'Paul de la Tour' })).toEqual({
      firstName: 'Paul',
      lastName: 'de la Tour',
      phone: '',
      email: '',
      addressQuery: '',
    });
  });

  it('ignores empty entries', () => {
    const draft = patientDraftFromContact({
      name: 'Ali',
      phoneNumbers: [{ label: 'mobile', number: '  ' }, { label: 'fixe', number: '0491000000' }],
      emails: [{ label: 'perso', email: '' }],
    });

    expect(draft.lastName).toBe('Ali');
    expect(draft.phone).toBe('0491000000');
    expect(draft.email).toBe('');
  });
});
