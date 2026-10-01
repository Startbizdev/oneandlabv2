import { createAccountDeletionApi } from '@oneandlab/shared-api';
import { apiRequest } from '@/api/client';

export const accountDeletionApi = createAccountDeletionApi(apiRequest);
