import { nextTick, watch, type Ref } from 'vue';
import {
  isCareGalleryDeepLinkQuery,
  parseCarePhotoIdFromQuery,
  stripCareGalleryQuery,
} from '~/utils/care-gallery-deep-link';

/**
 * Depuis la cloche : ?careGallery=1&carePhoto=<id> → ouvre la modal d’échange (pas seulement scroll).
 */
export function useCareGalleryNotificationDeepLink(options: {
  careDocs: Ref<{ id?: string }[]>;
  documentsLoading: Ref<boolean>;
  openCareDiscussion: (doc: { id?: string }) => void;
  openGeneralExchange?: () => void;
}) {
  const route = useRoute();
  const router = useRouter();

  watch(
    () => ({
      q: route.query.careGallery,
      carePhoto: route.query.carePhoto,
      ids: options.careDocs.value.map((d) => String(d.id || '')).filter(Boolean).join(','),
      loading: options.documentsLoading.value,
    }),
    async ({ q, carePhoto, ids, loading }) => {
      if (!isCareGalleryDeepLinkQuery(q)) return;
      if (loading) return;
      const availableIds = ids.split(',').filter(Boolean);
      if (availableIds.length === 0) {
        if (options.openGeneralExchange) {
          options.openGeneralExchange();
          await nextTick();
          document.getElementById('rdv-care-photos-section')?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
          stripCareGalleryQuery(route, router);
        }
        return;
      }

      const targetId = parseCarePhotoIdFromQuery(carePhoto, availableIds);
      if (!targetId) return;

      const doc = options.careDocs.value.find((d) => String(d.id) === targetId);
      if (!doc) return;

      options.openCareDiscussion(doc);
      await nextTick();
      const scrollEl =
        document.getElementById(`rdv-care-photo-${targetId}`) ||
        document.getElementById(`rdv-doc-${targetId}`) ||
        document.getElementById('rdv-care-photos-section');
      scrollEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      stripCareGalleryQuery(route, router);
    },
  );
}
