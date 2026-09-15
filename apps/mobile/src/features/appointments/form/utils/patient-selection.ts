type SelectionCallbacks<Patient, Address> = {
  fetch: (id: string) => Promise<Patient>;
  address: (patient: Patient) => Promise<Address>;
  clear: () => void;
  apply: (patient: Patient, address: Address) => void;
  state: (loading: boolean, error: boolean) => void;
};

/** Prevents late identity or geocoding responses from replacing the current patient. */
export class PatientSelection<Patient, Address> {
  private version = 0;
  constructor(private readonly callbacks: SelectionCallbacks<Patient, Address>) {}

  invalidate() { this.version++; }

  reset() {
    this.invalidate();
    this.callbacks.clear();
    this.callbacks.state(false, false);
  }

  async load(id: string): Promise<void> {
    const version = ++this.version;
    this.callbacks.state(true, false);
    this.callbacks.clear();
    try {
      const patient = await this.callbacks.fetch(id);
      if (version !== this.version) return;
      const address = await this.callbacks.address(patient);
      if (version !== this.version) return;
      this.callbacks.apply(patient, address);
      this.callbacks.state(false, false);
    } catch {
      if (version === this.version) this.callbacks.state(false, true);
    }
  }
}
