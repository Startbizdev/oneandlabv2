export interface QualificationDraft {
  codes: string[];
  others: string[];
}

/** Keep autosaves ordered, including across two mounted profile views. */
export function qualificationSaveOptions(
  userId: string,
  currentUserId: () => string | undefined,
  write: (userId: string, draft: QualificationDraft) => Promise<unknown>,
) {
  return {
    scope: { id: `profile-qualifications:${userId}` },
    mutationFn: async (draft: QualificationDraft) => {
      // A queued write can start after the account that queued it has signed out.
      if (!userId || currentUserId() !== userId) {
        throw new Error('Reconnectez-vous pour enregistrer vos formations.');
      }
      return write(userId, draft);
    },
  };
}
