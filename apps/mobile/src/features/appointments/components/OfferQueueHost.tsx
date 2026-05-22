import { OfferAppointmentModal } from '../detail/components/OfferAppointmentModal';

/** Modal FIFO offres entrantes — layout infirmier uniquement. */
export function OfferQueueHost({ detailPathPrefix }: { detailPathPrefix: string }) {
  return <OfferAppointmentModal detailPathPrefix={detailPathPrefix} />;
}
