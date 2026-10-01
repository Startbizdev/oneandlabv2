import type { ImageSourcePropType } from 'react-native';

/** Illustrations éditoriales (états vides, tutoriel). Metro exige des require() statiques. */
export const ILLUSTRATIONS = {
  appointments: require('../../assets/illustrations/appointments.png'),
  booking: require('../../assets/illustrations/booking.png'),
  calendar: require('../../assets/illustrations/calendar.png'),
  error: require('../../assets/illustrations/error.png'),
  'health-record': require('../../assets/illustrations/health-record.png'),
  history: require('../../assets/illustrations/history.png'),
  messages: require('../../assets/illustrations/messages.png'),
  notifications: require('../../assets/illustrations/notifications.png'),
  patients: require('../../assets/illustrations/patients.png'),
  pharmacy: require('../../assets/illustrations/pharmacy.png'),
  prescriptions: require('../../assets/illustrations/prescriptions.png'),
  relatives: require('../../assets/illustrations/relatives.png'),
  requests: require('../../assets/illustrations/requests.png'),
  results: require('../../assets/illustrations/results.png'),
  reviews: require('../../assets/illustrations/reviews.png'),
  search: require('../../assets/illustrations/search.png'),
  success: require('../../assets/illustrations/success.png'),
  tour: require('../../assets/illustrations/tour.png'),
  welcome: require('../../assets/illustrations/welcome.png'),
} satisfies Record<string, ImageSourcePropType>;

export type IllustrationKey = keyof typeof ILLUSTRATIONS;
