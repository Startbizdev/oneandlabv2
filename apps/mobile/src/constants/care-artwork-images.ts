import type { ImageSourcePropType } from 'react-native';
import type { CareArtworkKey } from '@oneandlab/shared-utils';

/** Metro needs static require() calls: one entry per key of CARE_ARTWORK_KEYS. */
export const CARE_ARTWORK_IMAGES: Record<CareArtworkKey, ImageSourcePropType> = {
  autre: require('../assets/care-art/autre.png'),
  'bilan-sanguin': require('../assets/care-art/bilan-sanguin.png'),
  'certificat-de-deces': require('../assets/care-art/certificat-de-deces.png'),
  'depistages-infections': require('../assets/care-art/depistages-infections.png'),
  'epilation-laser': require('../assets/care-art/epilation-laser.png'),
  'examen-des-selles': require('../assets/care-art/examen-des-selles.png'),
  'examen-des-urines': require('../assets/care-art/examen-des-urines.png'),
  grossesse: require('../assets/care-art/grossesse.png'),
  injection: require('../assets/care-art/injection.png'),
  'mon-bilan-prevention': require('../assets/care-art/mon-bilan-prevention.png'),
  'pansement-plaie': require('../assets/care-art/pansement-plaie.png'),
  perfusion: require('../assets/care-art/perfusion.png'),
  'prelevement-bacteriologique': require('../assets/care-art/prelevement-bacteriologique.png'),
  'prise-de-sang': require('../assets/care-art/prise-de-sang.png'),
  'retrait-de-points-agrafes': require('../assets/care-art/retrait-de-points-agrafes.png'),
  'soins-d-hygiene': require('../assets/care-art/soins-d-hygiene.png'),
  'soins-de-stomie': require('../assets/care-art/soins-de-stomie.png'),
  'soins-infirmiers': require('../assets/care-art/soins-infirmiers.png'),
  'soins-palliatifs': require('../assets/care-art/soins-palliatifs.png'),
  'soins-respiratoires': require('../assets/care-art/soins-respiratoires.png'),
  'sonde-urinaire': require('../assets/care-art/sonde-urinaire.png'),
  'suivi-diabete': require('../assets/care-art/suivi-diabete.png'),
  'suivi-post-hospitalisation': require('../assets/care-art/suivi-post-hospitalisation.png'),
  'surveillance-constante': require('../assets/care-art/surveillance-constante.png'),
  traitement: require('../assets/care-art/traitement.png'),
  vaccination: require('../assets/care-art/vaccination.png'),
};
