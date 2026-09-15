# Inventaire de la surface UI

Généré par `node scripts/audit-ui-surface.mjs`. Un fichier inventorié ne signifie pas que sa refonte ou sa recette est terminée.

122 pages web · 127 fichiers de routage mobile · 156 composants Vue · 440 composants/écrans TSX mobiles.

Les scénarios ci-dessous sont présents dans les fichiers de tests ; leurs derniers résultats sont consignés dans etat-et-risques.md. Un scénario ne couvre pas toutes les actions d’une page.

## Pages web

| Fichier | Layout déclaré | Scénarios automatisés existants | Recette complète |
|---|---|---|---|
| frontend/pages/Laboratoire/[slug].vue | default | public/SEO/responsive | Restante |
| frontend/pages/admin/abonnements/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/admin/ai/index.vue | dashboard | parcours avec données | Restante |
| frontend/pages/admin/appointments/[id]/edit.vue | dashboard | parcours avec données | Restante |
| frontend/pages/admin/appointments/[id]/index.vue | dashboard | parcours avec données | Restante |
| frontend/pages/admin/appointments/index.vue | dashboard | responsive/navigation | Restante |
| frontend/pages/admin/appointments/new.vue | dashboard | parcours avec données | Restante |
| frontend/pages/admin/appointments/notifications.vue | dashboard | parcours avec données | Restante |
| frontend/pages/admin/calendar/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/admin/categories/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/admin/coverage/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/admin/dispatch/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/admin/index.vue | dashboard | parcours avec données | Restante |
| frontend/pages/admin/inscriptions/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/admin/lab-brands/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/admin/logs/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/admin/notifications/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/admin/qr-code/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/admin/reviews/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/admin/test-table.vue | dashboard | À ajouter | Restante |
| frontend/pages/admin/users/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/admin/users/new.vue | dashboard | API indisponible | Restante |
| frontend/pages/cgv.vue | default | responsive/navigation | Restante |
| frontend/pages/contact.vue | default | responsive/navigation | Restante |
| frontend/pages/forgot-password.vue | défaut / délégué | parcours avec données | Restante |
| frontend/pages/index.vue | default | public/SEO/responsive | Restante |
| frontend/pages/infirmier/[slug].vue | default | public/SEO/responsive | Restante |
| frontend/pages/infirmiers/[ville].vue | défaut / délégué | À ajouter | Restante |
| frontend/pages/infirmiers/index.vue | default | public/SEO/responsive | Restante |
| frontend/pages/infirmiers/ville/[ville].vue | default | public/SEO/responsive | Restante |
| frontend/pages/lab/abonnement/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/lab/appointments/[id].vue | dashboard | parcours avec données | Restante |
| frontend/pages/lab/appointments/index.vue | dashboard | responsive/navigation | Restante |
| frontend/pages/lab/appointments/new.vue | dashboard | parcours avec données | Restante |
| frontend/pages/lab/calendar/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/lab/index.vue | dashboard | parcours avec données | Restante |
| frontend/pages/lab/patients/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/lab/patients/new.vue | dashboard | API indisponible | Restante |
| frontend/pages/lab/preleveurs/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/lab/qr-code/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/lab/register.vue | default | responsive/navigation | Restante |
| frontend/pages/lab/reviews/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/lab/settings/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/lab/stats/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/lab/subaccounts/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/laboratoires/[ville].vue | défaut / délégué | À ajouter | Restante |
| frontend/pages/laboratoires/index.vue | default | public/SEO/responsive | Restante |
| frontend/pages/laboratoires/ville/[ville].vue | default | public/SEO/responsive | Restante |
| frontend/pages/login.vue | défaut / délégué | parcours avec données | Restante |
| frontend/pages/mentions-legales.vue | default | responsive/navigation | Restante |
| frontend/pages/nurse/abonnement/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/nurse/appointments/[id].vue | dashboard | parcours avec données | Restante |
| frontend/pages/nurse/appointments/index.vue | dashboard | responsive/navigation | Restante |
| frontend/pages/nurse/appointments/new.vue | dashboard | responsive/navigation | Restante |
| frontend/pages/nurse/calendar/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/nurse/demandes/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/nurse/index.vue | dashboard | À ajouter | Restante |
| frontend/pages/nurse/onboarding.vue | défaut / délégué | parcours avec données | Restante |
| frontend/pages/nurse/passage/[seriesId].vue | dashboard | parcours avec données | Restante |
| frontend/pages/nurse/passage/new.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/nurse/passage/patient-pick.vue | dashboard | API indisponible | Restante |
| frontend/pages/nurse/patients/index.vue | dashboard | parcours avec données | Restante |
| frontend/pages/nurse/patients/new.vue | dashboard | À ajouter | Restante |
| frontend/pages/nurse/prescriptions/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/nurse/qr-code/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/nurse/register.vue | default | responsive/navigation | Restante |
| frontend/pages/nurse/resultats/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/nurse/reviews/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/nurse/soins/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/nurse/tournee/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/p/rdv/[token].vue | patient | parcours avec données | Restante |
| frontend/pages/patient/appointments/[id].vue | patient | parcours avec données | Restante |
| frontend/pages/patient/documents/index.vue | patient | API indisponible · parcours avec données | Restante |
| frontend/pages/patient/index.vue | patient | responsive/navigation | Restante |
| frontend/pages/patient/onboarding.vue | défaut / délégué | parcours avec données | Restante |
| frontend/pages/patient/profile/index.vue | patient | API indisponible · parcours avec données | Restante |
| frontend/pages/patient/register.vue | default | responsive/navigation | Restante |
| frontend/pages/patient/relatives/index.vue | patient | API indisponible · parcours avec données | Restante |
| frontend/pages/patient/resultats/index.vue | patient | API indisponible | Restante |
| frontend/pages/patient/reviews/index.vue | patient | API indisponible | Restante |
| frontend/pages/politique-confidentialite.vue | default | responsive/navigation | Restante |
| frontend/pages/pour-les-infirmiers/index.vue | default | responsive/navigation | Restante |
| frontend/pages/pour-les-infirmiers/tarifs.vue | default | public/SEO/responsive | Restante |
| frontend/pages/pour-les-laboratoires/index.vue | default | responsive/navigation | Restante |
| frontend/pages/pour-les-laboratoires/tarifs.vue | default | public/SEO/responsive | Restante |
| frontend/pages/pour-les-patients.vue | default | responsive/navigation | Restante |
| frontend/pages/pour-les-professionnels.vue | default | responsive/navigation | Restante |
| frontend/pages/preleveur/appointments/[id].vue | dashboard | parcours avec données | Restante |
| frontend/pages/preleveur/appointments/index.vue | dashboard | responsive/navigation | Restante |
| frontend/pages/preleveur/calendar/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/preleveur/index.vue | dashboard | À ajouter | Restante |
| frontend/pages/preleveur/onboarding.vue | défaut / délégué | parcours avec données | Restante |
| frontend/pages/preleveur/tournee/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/pro/appointments/[id].vue | dashboard | parcours avec données | Restante |
| frontend/pages/pro/appointments/index.vue | dashboard | responsive/navigation | Restante |
| frontend/pages/pro/appointments/new.vue | dashboard | parcours avec données | Restante |
| frontend/pages/pro/calendar/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/pro/index.vue | dashboard | À ajouter | Restante |
| frontend/pages/pro/onboarding.vue | défaut / délégué | parcours avec données | Restante |
| frontend/pages/pro/patients/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/pro/patients/new.vue | dashboard | API indisponible | Restante |
| frontend/pages/pro/prescriptions/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/pro/qr-code/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/pro/register.vue | default | responsive/navigation | Restante |
| frontend/pages/pro/resultats/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/professionnel/[slug].vue | default | public/SEO/responsive | Restante |
| frontend/pages/profile/index.vue | défaut / délégué | parcours avec données | Restante |
| frontend/pages/qr/[token].vue | défaut / délégué | parcours avec données | Restante |
| frontend/pages/register/merci.vue | default | responsive/navigation | Restante |
| frontend/pages/rendez-vous/nouveau.vue | patient | parcours avec données | Restante |
| frontend/pages/rendez-vous/paiement-reussi.vue | patient | parcours avec données | Restante |
| frontend/pages/reset-password.vue | défaut / délégué | parcours avec données | Restante |
| frontend/pages/subaccount/appointments/[id].vue | dashboard | parcours avec données | Restante |
| frontend/pages/subaccount/appointments/index.vue | dashboard | responsive/navigation | Restante |
| frontend/pages/subaccount/appointments/new.vue | dashboard | parcours avec données | Restante |
| frontend/pages/subaccount/calendar/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/subaccount/index.vue | dashboard | parcours avec données | Restante |
| frontend/pages/subaccount/patients/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/subaccount/patients/new.vue | dashboard | À ajouter | Restante |
| frontend/pages/subaccount/preleveurs/index.vue | dashboard | API indisponible · parcours avec données | Restante |
| frontend/pages/subaccount/qr-code/index.vue | dashboard | API indisponible | Restante |
| frontend/pages/subaccount/reviews/index.vue | dashboard | parcours avec données | Restante |

## Routage mobile

| Fichier | Recette sur appareil |
|---|---|
| apps/mobile/app/(auth)/_layout.tsx | À vérifier |
| apps/mobile/app/(auth)/login.tsx | À vérifier |
| apps/mobile/app/(auth)/register/_layout.tsx | À vérifier |
| apps/mobile/app/(auth)/register/merci.tsx | À vérifier |
| apps/mobile/app/(auth)/register/nurse.tsx | À vérifier |
| apps/mobile/app/(auth)/register/patient.tsx | À vérifier |
| apps/mobile/app/(auth)/register/pro.tsx | À vérifier |
| apps/mobile/app/(auth)/welcome.tsx | À vérifier |
| apps/mobile/app/(nurse)/(tabs)/_layout.tsx | À vérifier |
| apps/mobile/app/(nurse)/(tabs)/appointments.tsx | À vérifier |
| apps/mobile/app/(nurse)/(tabs)/calendar.tsx | À vérifier |
| apps/mobile/app/(nurse)/(tabs)/demandes.tsx | À vérifier |
| apps/mobile/app/(nurse)/(tabs)/more.tsx | À vérifier |
| apps/mobile/app/(nurse)/(tabs)/patients.tsx | À vérifier |
| apps/mobile/app/(nurse)/_layout.tsx | À vérifier |
| apps/mobile/app/(nurse)/abonnement.tsx | À vérifier |
| apps/mobile/app/(nurse)/ai.tsx | À vérifier |
| apps/mobile/app/(nurse)/appointment/[id].tsx | À vérifier |
| apps/mobile/app/(nurse)/appointment/[id]/care-photo/[photoId].tsx | À vérifier |
| apps/mobile/app/(nurse)/appointment/[id]/conversation.tsx | À vérifier |
| apps/mobile/app/(nurse)/appointment/[id]/edit.tsx | À vérifier |
| apps/mobile/app/(nurse)/appointment/[id]/exchange.tsx | À vérifier |
| apps/mobile/app/(nurse)/appointment/[id]/prescription.tsx | À vérifier |
| apps/mobile/app/(nurse)/appointments/new.tsx | À vérifier |
| apps/mobile/app/(nurse)/informations-legales.tsx | À vérifier |
| apps/mobile/app/(nurse)/notifications.tsx | À vérifier |
| apps/mobile/app/(nurse)/onboarding.tsx | À vérifier |
| apps/mobile/app/(nurse)/passage/[seriesId].tsx | À vérifier |
| apps/mobile/app/(nurse)/passage/new.tsx | À vérifier |
| apps/mobile/app/(nurse)/passage/patient-pick.tsx | À vérifier |
| apps/mobile/app/(nurse)/patient/[id].tsx | À vérifier |
| apps/mobile/app/(nurse)/patient/[id]/documents.tsx | À vérifier |
| apps/mobile/app/(nurse)/patient/[id]/health-record.tsx | À vérifier |
| apps/mobile/app/(nurse)/patient/[id]/history.tsx | À vérifier |
| apps/mobile/app/(nurse)/patient/[id]/prescriptions.tsx | À vérifier |
| apps/mobile/app/(nurse)/prescriptions.tsx | À vérifier |
| apps/mobile/app/(nurse)/qr-code.tsx | À vérifier |
| apps/mobile/app/(nurse)/resultats.tsx | À vérifier |
| apps/mobile/app/(nurse)/reviews.tsx | À vérifier |
| apps/mobile/app/(nurse)/tournee/index.tsx | À vérifier |
| apps/mobile/app/(nurse)/web.tsx | À vérifier |
| apps/mobile/app/(patient)/(tabs)/_layout.tsx | À vérifier |
| apps/mobile/app/(patient)/(tabs)/ai.tsx | À vérifier |
| apps/mobile/app/(patient)/(tabs)/appointments.tsx | À vérifier |
| apps/mobile/app/(patient)/(tabs)/book.tsx | À vérifier |
| apps/mobile/app/(patient)/(tabs)/more.tsx | À vérifier |
| apps/mobile/app/(patient)/(tabs)/relatives.tsx | À vérifier |
| apps/mobile/app/(patient)/_layout.tsx | À vérifier |
| apps/mobile/app/(patient)/appointment/[id].tsx | À vérifier |
| apps/mobile/app/(patient)/appointment/[id]/conversation.tsx | À vérifier |
| apps/mobile/app/(patient)/appointment/[id]/documents.tsx | À vérifier |
| apps/mobile/app/(patient)/appointment/[id]/edit-schedule.tsx | À vérifier |
| apps/mobile/app/(patient)/appointment/[id]/history.tsx | À vérifier |
| apps/mobile/app/(patient)/booking/new.tsx | À vérifier |
| apps/mobile/app/(patient)/health-data.tsx | À vérifier |
| apps/mobile/app/(patient)/health-record/index.tsx | À vérifier |
| apps/mobile/app/(patient)/health-record/wizard.tsx | À vérifier |
| apps/mobile/app/(patient)/informations-legales.tsx | À vérifier |
| apps/mobile/app/(patient)/notifications.tsx | À vérifier |
| apps/mobile/app/(patient)/onboarding.tsx | À vérifier |
| apps/mobile/app/(patient)/relatives/[id].tsx | À vérifier |
| apps/mobile/app/(patient)/relatives/[id]/documents.tsx | À vérifier |
| apps/mobile/app/(patient)/resultats.tsx | À vérifier |
| apps/mobile/app/(patient)/reviews.tsx | À vérifier |
| apps/mobile/app/(patient)/web.tsx | À vérifier |
| apps/mobile/app/(preleveur)/(tabs)/_layout.tsx | À vérifier |
| apps/mobile/app/(preleveur)/(tabs)/calendar.tsx | À vérifier |
| apps/mobile/app/(preleveur)/(tabs)/index.tsx | À vérifier |
| apps/mobile/app/(preleveur)/(tabs)/more.tsx | À vérifier |
| apps/mobile/app/(preleveur)/(tabs)/tournee.tsx | À vérifier |
| apps/mobile/app/(preleveur)/_layout.tsx | À vérifier |
| apps/mobile/app/(preleveur)/ai.tsx | À vérifier |
| apps/mobile/app/(preleveur)/appointment/[id].tsx | À vérifier |
| apps/mobile/app/(preleveur)/appointment/[id]/conversation.tsx | À vérifier |
| apps/mobile/app/(preleveur)/appointment/[id]/edit.tsx | À vérifier |
| apps/mobile/app/(preleveur)/informations-legales.tsx | À vérifier |
| apps/mobile/app/(preleveur)/notifications.tsx | À vérifier |
| apps/mobile/app/(preleveur)/onboarding.tsx | À vérifier |
| apps/mobile/app/(preleveur)/web.tsx | À vérifier |
| apps/mobile/app/(pro)/(tabs)/_layout.tsx | À vérifier |
| apps/mobile/app/(pro)/(tabs)/appointments.tsx | À vérifier |
| apps/mobile/app/(pro)/(tabs)/calendar.tsx | À vérifier |
| apps/mobile/app/(pro)/(tabs)/index.tsx | À vérifier |
| apps/mobile/app/(pro)/(tabs)/more.tsx | À vérifier |
| apps/mobile/app/(pro)/(tabs)/patients.tsx | À vérifier |
| apps/mobile/app/(pro)/(tabs)/prescriptions.tsx | À vérifier |
| apps/mobile/app/(pro)/_layout.tsx | À vérifier |
| apps/mobile/app/(pro)/ai.tsx | À vérifier |
| apps/mobile/app/(pro)/appointment/[id].tsx | À vérifier |
| apps/mobile/app/(pro)/appointment/[id]/care-photo/[photoId].tsx | À vérifier |
| apps/mobile/app/(pro)/appointment/[id]/conversation.tsx | À vérifier |
| apps/mobile/app/(pro)/appointment/[id]/edit.tsx | À vérifier |
| apps/mobile/app/(pro)/appointment/[id]/exchange.tsx | À vérifier |
| apps/mobile/app/(pro)/appointment/[id]/prescription.tsx | À vérifier |
| apps/mobile/app/(pro)/appointments/new.tsx | À vérifier |
| apps/mobile/app/(pro)/informations-legales.tsx | À vérifier |
| apps/mobile/app/(pro)/notifications.tsx | À vérifier |
| apps/mobile/app/(pro)/onboarding.tsx | À vérifier |
| apps/mobile/app/(pro)/patient/[id].tsx | À vérifier |
| apps/mobile/app/(pro)/patient/[id]/documents.tsx | À vérifier |
| apps/mobile/app/(pro)/patient/[id]/health-record.tsx | À vérifier |
| apps/mobile/app/(pro)/patient/[id]/history.tsx | À vérifier |
| apps/mobile/app/(pro)/patient/[id]/prescriptions.tsx | À vérifier |
| apps/mobile/app/(pro)/qr-code.tsx | À vérifier |
| apps/mobile/app/(pro)/resultats.tsx | À vérifier |
| apps/mobile/app/(pro)/web.tsx | À vérifier |
| apps/mobile/app/_layout.tsx | À vérifier |
| apps/mobile/app/index.tsx | À vérifier |
| apps/mobile/app/notifications.tsx | À vérifier |
| apps/mobile/app/profile/_layout.tsx | À vérifier |
| apps/mobile/app/profile/coverage.tsx | À vérifier |
| apps/mobile/app/profile/documents.tsx | À vérifier |
| apps/mobile/app/profile/help/[slug].tsx | À vérifier |
| apps/mobile/app/profile/help/index.tsx | À vérifier |
| apps/mobile/app/profile/index.tsx | À vérifier |
| apps/mobile/app/profile/menu.tsx | À vérifier |
| apps/mobile/app/profile/nurse/care-types.tsx | À vérifier |
| apps/mobile/app/profile/nurse/coordinates.tsx | À vérifier |
| apps/mobile/app/profile/nurse/coverage.tsx | À vérifier |
| apps/mobile/app/profile/nurse/presentation.tsx | À vérifier |
| apps/mobile/app/profile/nurse/qualifications.tsx | À vérifier |
| apps/mobile/app/profile/nurse/settings.tsx | À vérifier |
| apps/mobile/app/profile/personal.tsx | À vérifier |
| apps/mobile/app/profile/preferences.tsx | À vérifier |
| apps/mobile/app/profile/security.tsx | À vérifier |
| apps/mobile/app/profile/settings.tsx | À vérifier |
| apps/mobile/app/profile/support.tsx | À vérifier |

## Composants web

- frontend/components/Map.vue
- frontend/components/RelativeDrawer.vue
- frontend/components/UEmpty.vue
- frontend/components/admin/AdminUserListRow.vue
- frontend/components/admin/CreatorSelectField.vue
- frontend/components/admin/dispatch/AdminDispatchActorsCard.vue
- frontend/components/admin/dispatch/AdminDispatchOffersPanel.vue
- frontend/components/admin/dispatch/AdminDispatchTimeline.vue
- frontend/components/billing/LabPlanCards.vue
- frontend/components/billing/NursePlanCards.vue
- frontend/components/dashboard/AdminAppointmentAddressCard.vue
- frontend/components/dashboard/AdminAppointmentAssignmentCard.vue
- frontend/components/dashboard/AdminAppointmentEditPage.vue
- frontend/components/dashboard/AdminLabBrandChoiceBanner.vue
- frontend/components/dashboard/AppointmentConversationPanel.vue
- frontend/components/dashboard/AppointmentDetailContactPhoneRow.vue
- frontend/components/dashboard/AppointmentDetailPage.vue
- frontend/components/dashboard/AppointmentDetailRdvAssigneeOriginKvSection.vue
- frontend/components/dashboard/AppointmentDetailRdvFieldRows.vue
- frontend/components/dashboard/AppointmentDetailRdvInfoCard.vue
- frontend/components/dashboard/AppointmentDetailRdvPatientKvSection.vue
- frontend/components/dashboard/AppointmentDetailSidebarTerminalShell.vue
- frontend/components/dashboard/AppointmentDocumentsSection.vue
- frontend/components/dashboard/AppointmentLabAssignmentCard.vue
- frontend/components/dashboard/AppointmentListAccessModals.vue
- frontend/components/dashboard/AppointmentListCard.vue
- frontend/components/dashboard/AppointmentListFiltersSheet.vue
- frontend/components/dashboard/AppointmentListPage.vue
- frontend/components/dashboard/CalendarPage.vue
- frontend/components/dashboard/CancelAppointmentModal.vue
- frontend/components/dashboard/CarePhotoDiscussionModal.vue
- frontend/components/dashboard/CompactAssigneeRating.vue
- frontend/components/dashboard/DashboardAppointmentCard.vue
- frontend/components/dashboard/DashboardLayout.vue
- frontend/components/dashboard/DashboardMultiAppointmentWizard.vue
- frontend/components/dashboard/DashboardPendingAppointments.vue
- frontend/components/dashboard/DashboardTodayAppointments.vue
- frontend/components/dashboard/LabDashboard.vue
- frontend/components/dashboard/LabResultsListPage.vue
- frontend/components/dashboard/NurseRdvSharePanel.vue
- frontend/components/dashboard/PatientAppointmentHistorySection.vue
- frontend/components/dashboard/PatientClinicalVitalHistoryModal.vue
- frontend/components/dashboard/PatientClinicalVitalModal.vue
- frontend/components/dashboard/PatientClinicalVitalsPanel.vue
- frontend/components/dashboard/PatientHealthRecordPanel.vue
- frontend/components/dashboard/PatientHealthRecordSectionModal.vue
- frontend/components/dashboard/PatientListCompactGrid.vue
- frontend/components/dashboard/PatientPrescriptionsSection.vue
- frontend/components/dashboard/PrescriptionHistoryRow.vue
- frontend/components/dashboard/PrescriptionPdfPreviewModal.vue
- frontend/components/dashboard/PrescriptionSection.vue
- frontend/components/dashboard/PrescriptionsToolPage.vue
- frontend/components/dashboard/ProfessionalCreatorProfileSlideover.vue
- frontend/components/dashboard/RdvCarePhotosSection.vue
- frontend/components/dashboard/RdvDocumentsEmbeddedProvide.vue
- frontend/components/dashboard/RedispatchAppointmentModal.vue
- frontend/components/dashboard/RescheduleAppointmentModal.vue
- frontend/components/dashboard/ReviewReceivedCard.vue
- frontend/components/dashboard/StaffPatientHubList.vue
- frontend/components/dashboard/StaffPatientHubPatientsPage.vue
- frontend/components/dashboard/SubscriptionBanner.vue
- frontend/components/dashboard/TeamMemberCard.vue
- frontend/components/dashboard/TeamMemberListPage.vue
- frontend/components/forms/UnifiedAppointmentForm.vue
- frontend/components/landing/maquette/LandingMaquetteBento.vue
- frontend/components/landing/maquette/LandingMaquetteCta.vue
- frontend/components/landing/maquette/LandingMaquetteFaq.vue
- frontend/components/landing/maquette/LandingMaquetteFooter.vue
- frontend/components/landing/maquette/LandingMaquetteHeader.vue
- frontend/components/landing/maquette/LandingMaquetteHero.vue
- frontend/components/landing/maquette/LandingMaquetteInlineCta.vue
- frontend/components/landing/maquette/LandingMaquetteMarketingBackdrop.vue
- frontend/components/landing/maquette/LandingMaquetteMarketingMobileDrill.vue
- frontend/components/landing/maquette/LandingMaquettePatientFocus.vue
- frontend/components/landing/maquette/LandingMaquettePillarGrid.vue
- frontend/components/landing/maquette/LandingMaquetteServices.vue
- frontend/components/landing/maquette/LandingMaquetteStepsCards.vue
- frontend/components/layout/MarketingAppShell.vue
- frontend/components/nurse/NurseTourRescheduleModal.vue
- frontend/components/nurse/NurseTourStopCare.vue
- frontend/components/nurse/PassageCarePicker.vue
- frontend/components/nurse/PassageFieldRow.vue
- frontend/components/nurse/PassagePlanningFormFields.vue
- frontend/components/nurse/PassagePlanningModal.vue
- frontend/components/nurse/PassageSimpleListRow.vue
- frontend/components/nurse/PatientAbsenceModal.vue
- frontend/components/nurse/TourSortFilterModal.vue
- frontend/components/nurse/TourStopRouteChip.vue
- frontend/components/onboarding/TutorialCarousel.vue
- frontend/components/onboarding/TutorialIllustration.vue
- frontend/components/patient/PatientEditScheduleModal.vue
- frontend/components/patient/PatientRdvListRow.vue
- frontend/components/patient/PatientRdvListSearchField.vue
- frontend/components/patient/PatientSelectMenuEmpty.vue
- frontend/components/prescription/NursePrescriptionScopeHelp.vue
- frontend/components/prescription/PrescriptionMedicalFields.vue
- frontend/components/prescription/PrescriptionProfileGapsAlert.vue
- frontend/components/prescription/PrescriptionSignaturePad.vue
- frontend/components/prescription/PrescriptionSignatureProfileBlock.vue
- frontend/components/profile/CardHeader.vue
- frontend/components/profile/CoverageZoneEditorModal.vue
- frontend/components/profile/FormInput.vue
- frontend/components/profile/LoadingState.vue
- frontend/components/profile/ProEmploiField.vue
- frontend/components/profile/ProfileAccountSecurity.vue
- frontend/components/profile/ProfileCoverageSquareMap.vue
- frontend/components/profile/ProfileCoverageZonePanel.vue
- frontend/components/profile/ProfileDocuments.vue
- frontend/components/profile/ProfileImagesBlock.vue
- frontend/components/profile/ProfilePersonalInfo.vue
- frontend/components/public/ProviderPublicProfilePanel.vue
- frontend/components/public/ProviderPublicProfileSlideover.vue
- frontend/components/public/PublicProfileBio.vue
- frontend/components/public/PublicProfileCard.vue
- frontend/components/public/PublicProfileFAQ.vue
- frontend/components/public/PublicProfileHeader.vue
- frontend/components/public/PublicProfileLayout.vue
- frontend/components/public/PublicProfileMapSquare.vue
- frontend/components/public/PublicProfileReviews.vue
- frontend/components/public/PublicProfileServices.vue
- frontend/components/public/PublicProfileShare.vue
- frontend/components/qr/QrCodeDashboard.vue
- frontend/components/register/RegisterForm.vue
- frontend/components/rendez-vous/BookingCelebrationOverlay.vue
- frontend/components/rendez-vous/BookingWizardSegmentContext.vue
- frontend/components/rendez-vous/CareCategoryFilters.vue
- frontend/components/rendez-vous/CareServiceQuickOptionsModal.vue
- frontend/components/rendez-vous/LabBrandPreferenceStep.vue
- frontend/components/rendez-vous/RendezVousCareSelection.vue
- frontend/components/rendez-vous/RendezVousFormStep.vue
- frontend/components/rendez-vous/RendezVousStickyFooter.vue
- frontend/components/rendez-vous/SelectedServicesCartSummary.vue
- frontend/components/reviews/ReceivedReviewsPage.vue
- frontend/components/shell/AppPageHeader.vue
- frontend/components/shell/AppPageShell.vue
- frontend/components/ui/AddressSelector.vue
- frontend/components/ui/AlertModal.vue
- frontend/components/ui/AppointmentModal.vue
- frontend/components/ui/AppointmentStatusSelect.vue
- frontend/components/ui/BirthdayPicker.vue
- frontend/components/ui/BookingAvailabilityTabs.vue
- frontend/components/ui/BookingDateCarousel.vue
- frontend/components/ui/Calendar.vue
- frontend/components/ui/CareAutreDetailInput.vue
- frontend/components/ui/CareCategoryVisual.vue
- frontend/components/ui/DashboardCardShell.vue
- frontend/components/ui/DatePicker.vue
- frontend/components/ui/DateRangePicker.vue
- frontend/components/ui/OpeningHoursWeek.vue
- frontend/components/ui/PasswordInput.vue
- frontend/components/ui/PatientUrgencyBadge.vue
- frontend/components/ui/PreferredNurseGenderButtons.vue
- frontend/components/ui/Reviews.vue
- frontend/components/ui/StatsCard.vue
- frontend/components/ui/TitleDashboard.vue
- frontend/components/ui/UserAvatar.vue

## Composants et écrans mobiles

- apps/mobile/src/components/ErrorBoundary.tsx
- apps/mobile/src/components/care/CareCategoryThumb.tsx
- apps/mobile/src/components/layout/FormScreen.tsx
- apps/mobile/src/components/layout/KeyboardScrollView.tsx
- apps/mobile/src/components/layout/ResponsiveContent.tsx
- apps/mobile/src/components/layout/Screen.tsx
- apps/mobile/src/components/layout/ScreenActionLayout.tsx
- apps/mobile/src/components/layout/form-scroll-context.tsx
- apps/mobile/src/components/layout/primitives.tsx
- apps/mobile/src/components/navigation/CaryHeaderBackground.tsx
- apps/mobile/src/components/navigation/CaryStackHeader.tsx
- apps/mobile/src/components/navigation/CaryTabHeader.tsx
- apps/mobile/src/components/navigation/ContentSheetShell.tsx
- apps/mobile/src/components/navigation/GlassHeaderButton.tsx
- apps/mobile/src/components/navigation/HeaderGradientOrbButton.tsx
- apps/mobile/src/components/navigation/LiquidGlassChrome.tsx
- apps/mobile/src/components/navigation/LiquidGlassTabHeader.tsx
- apps/mobile/src/components/navigation/NavChromeBackground.tsx
- apps/mobile/src/components/navigation/OpaqueHeaderChrome.tsx
- apps/mobile/src/components/navigation/RoleNativeTabsLayout.tsx
- apps/mobile/src/components/navigation/StackKeyboardScrollView.tsx
- apps/mobile/src/components/navigation/StackScreenFrame.tsx
- apps/mobile/src/components/navigation/StackScrollView.tsx
- apps/mobile/src/components/navigation/TabBar.tsx
- apps/mobile/src/components/navigation/TabBarIcon.tsx
- apps/mobile/src/components/navigation/TabBarIconBadge.tsx
- apps/mobile/src/components/navigation/TabSceneScrollView.tsx
- apps/mobile/src/components/navigation/TabScreenFrame.tsx
- apps/mobile/src/components/navigation/TabScreenShell.tsx
- apps/mobile/src/components/navigation/liquid-glass-header-inset.tsx
- apps/mobile/src/components/navigation/tab-screen-overlay.tsx
- apps/mobile/src/components/ui/ActionRowCard.tsx
- apps/mobile/src/components/ui/AppRefreshControl.tsx
- apps/mobile/src/components/ui/Badge.tsx
- apps/mobile/src/components/ui/BirthDatePicker.tsx
- apps/mobile/src/components/ui/BottomSheet.tsx
- apps/mobile/src/components/ui/BottomSheetKeyboardAwareScrollView.tsx
- apps/mobile/src/components/ui/BottomSheetModalContainer.tsx
- apps/mobile/src/components/ui/Button.tsx
- apps/mobile/src/components/ui/Card.tsx
- apps/mobile/src/components/ui/CarePictogram.tsx
- apps/mobile/src/components/ui/DayAppointmentsSheet.tsx
- apps/mobile/src/components/ui/DetailEntityRow.tsx
- apps/mobile/src/components/ui/DetailTabBar.tsx
- apps/mobile/src/components/ui/EmptyState.tsx
- apps/mobile/src/components/ui/FilterOptionChips.tsx
- apps/mobile/src/components/ui/FullWidthSegmentBar.tsx
- apps/mobile/src/components/ui/FullscreenImageViewer.tsx
- apps/mobile/src/components/ui/IconActionButton.tsx
- apps/mobile/src/components/ui/InfiniteQueryFlatList.tsx
- apps/mobile/src/components/ui/Input.tsx
- apps/mobile/src/components/ui/ListRowShell.tsx
- apps/mobile/src/components/ui/MiniDateCalendar.tsx
- apps/mobile/src/components/ui/PasswordInput.tsx
- apps/mobile/src/components/ui/ProfileAvatar.tsx
- apps/mobile/src/components/ui/QueryFlatList.tsx
- apps/mobile/src/components/ui/SceneRefreshIndicator.tsx
- apps/mobile/src/components/ui/ScreenFab.tsx
- apps/mobile/src/components/ui/SelectField.tsx
- apps/mobile/src/components/ui/SheetModal.tsx
- apps/mobile/src/components/ui/Skeleton.tsx
- apps/mobile/src/components/ui/StackCard.tsx
- apps/mobile/src/components/ui/Textarea.tsx
- apps/mobile/src/components/ui/ToggleSwitch.tsx
- apps/mobile/src/components/ui/scene-pull-refresh-context.tsx
- apps/mobile/src/components/ui/sheet-keyboard-accessory.tsx
- apps/mobile/src/components/ui/sheet-keyboard-context.tsx
- apps/mobile/src/components/ui/skeleton-presets.tsx
- apps/mobile/src/components/ui/tab-scene-mapped-list-body.tsx
- apps/mobile/src/components/web/AppWebViewScreen.tsx
- apps/mobile/src/features/address/components/AddressAutocomplete.tsx
- apps/mobile/src/features/ai-hub/components/CaryAiBookingRecapCard.tsx
- apps/mobile/src/features/ai-hub/components/CaryAiChatList.tsx
- apps/mobile/src/features/ai-hub/components/CaryAiVoiceDocumentUpload.tsx
- apps/mobile/src/features/ai-hub/components/CaryMarkdown.tsx
- apps/mobile/src/features/ai-hub/components/PatientAiAttachmentThumbnail.tsx
- apps/mobile/src/features/ai-hub/components/PatientAiChatComposer.tsx
- apps/mobile/src/features/ai-hub/components/PatientAiChatFooter.tsx
- apps/mobile/src/features/ai-hub/components/PatientAiConversationRow.tsx
- apps/mobile/src/features/ai-hub/components/PatientAiConversationsSheet.tsx
- apps/mobile/src/features/ai-hub/components/PatientAiDemoBanner.tsx
- apps/mobile/src/features/ai-hub/components/PatientAiHeaderMenuButton.tsx
- apps/mobile/src/features/ai-hub/components/PatientAiVoiceOverlay.tsx
- apps/mobile/src/features/ai-hub/screens/CaryAiHubScreen.tsx
- apps/mobile/src/features/ai-hub/screens/PatientAiMockScreen.tsx
- apps/mobile/src/features/ai-hub/screens/RoleAiHubRouteScreen.tsx
- apps/mobile/src/features/app-update/components/AppUpdateGate.tsx
- apps/mobile/src/features/app-update/components/ForceAppUpdateModal.tsx
- apps/mobile/src/features/appointments/components/AppointmentCard.tsx
- apps/mobile/src/features/appointments/components/AppointmentListRowCard.tsx
- apps/mobile/src/features/appointments/components/AppointmentsBookCta.tsx
- apps/mobile/src/features/appointments/components/AppointmentsFilterSheet.tsx
- apps/mobile/src/features/appointments/components/AppointmentsListFilterBar.tsx
- apps/mobile/src/features/appointments/components/AppointmentsRdvListToolbar.tsx
- apps/mobile/src/features/appointments/components/OfferQueueHost.tsx
- apps/mobile/src/features/appointments/components/RdvCareTagsRow.tsx
- apps/mobile/src/features/appointments/components/RdvListCardBody.tsx
- apps/mobile/src/features/appointments/components/RdvListCardCreneauRow.tsx
- apps/mobile/src/features/appointments/components/RdvListCardPersonRow.tsx
- apps/mobile/src/features/appointments/components/RdvScheduleCompactRow.tsx
- apps/mobile/src/features/appointments/detail/components/AddressCard.tsx
- apps/mobile/src/features/appointments/detail/components/AlreadyAcceptedModal.tsx
- apps/mobile/src/features/appointments/detail/components/AppointmentBatchSection.tsx
- apps/mobile/src/features/appointments/detail/components/AppointmentDetailActions.tsx
- apps/mobile/src/features/appointments/detail/components/AppointmentDetailBlockedEmptyState.tsx
- apps/mobile/src/features/appointments/detail/components/AppointmentStatusSelect.tsx
- apps/mobile/src/features/appointments/detail/components/AssigneeProfileRow.tsx
- apps/mobile/src/features/appointments/detail/components/AssigneeProfileSheets.tsx
- apps/mobile/src/features/appointments/detail/components/CarePhotosSection.tsx
- apps/mobile/src/features/appointments/detail/components/CompactAssigneeRating.tsx
- apps/mobile/src/features/appointments/detail/components/DetailDocumentsSection.tsx
- apps/mobile/src/features/appointments/detail/components/DetailSidebarActions.tsx
- apps/mobile/src/features/appointments/detail/components/DocumentsBlock.tsx
- apps/mobile/src/features/appointments/detail/components/HistoryTimeline.tsx
- apps/mobile/src/features/appointments/detail/components/OfferActions.tsx
- apps/mobile/src/features/appointments/detail/components/OfferAppointmentModal.tsx
- apps/mobile/src/features/appointments/detail/components/PatientDetailExtras.tsx
- apps/mobile/src/features/appointments/detail/components/PrescriptionNavRow.tsx
- apps/mobile/src/features/appointments/detail/components/PrescriptionSection.tsx
- apps/mobile/src/features/appointments/detail/components/ProPatientReviewSection.tsx
- apps/mobile/src/features/appointments/detail/components/ProviderPublicProfileSheet.tsx
- apps/mobile/src/features/appointments/detail/components/RdvAddressFieldRow.tsx
- apps/mobile/src/features/appointments/detail/components/RdvCancellationBanner.tsx
- apps/mobile/src/features/appointments/detail/components/RdvDocumentsPremiumPanel.tsx
- apps/mobile/src/features/appointments/detail/components/RdvFieldRows.tsx
- apps/mobile/src/features/appointments/detail/components/RdvInfoCard.tsx
- apps/mobile/src/features/appointments/detail/components/RdvKvCard.tsx
- apps/mobile/src/features/appointments/detail/components/RdvPatientPortalSection.tsx
- apps/mobile/src/features/appointments/detail/components/RdvPatientSection.tsx
- apps/mobile/src/features/appointments/detail/components/RdvPublishedReviewBanner.tsx
- apps/mobile/src/features/appointments/detail/components/RdvSection.tsx
- apps/mobile/src/features/appointments/detail/components/RdvUnifiedInfoCard.tsx
- apps/mobile/src/features/appointments/detail/components/SharePanel.tsx
- apps/mobile/src/features/appointments/detail/components/StaffPatientKvSection.tsx
- apps/mobile/src/features/appointments/detail/components/blocks/CancelAppointmentSheet.tsx
- apps/mobile/src/features/appointments/detail/components/blocks/CareExchangeHintBanner.tsx
- apps/mobile/src/features/appointments/detail/components/blocks/CarePhotoAttachment.tsx
- apps/mobile/src/features/appointments/detail/components/blocks/CarePhotoImage.tsx
- apps/mobile/src/features/appointments/detail/components/blocks/CarePhotoThumbnail.tsx
- apps/mobile/src/features/appointments/detail/components/blocks/DetailCareBlock.tsx
- apps/mobile/src/features/appointments/detail/components/blocks/DetailCarePhotosPanel.tsx
- apps/mobile/src/features/appointments/detail/components/blocks/StaffCancellationFields.tsx
- apps/mobile/src/features/appointments/detail/components/layout/DetailActionList.tsx
- apps/mobile/src/features/appointments/detail/components/layout/DetailHero.tsx
- apps/mobile/src/features/appointments/detail/components/layout/DetailInfoStack.tsx
- apps/mobile/src/features/appointments/detail/components/layout/DetailPanel.tsx
- apps/mobile/src/features/appointments/detail/components/layout/DetailPersonBlock.tsx
- apps/mobile/src/features/appointments/detail/components/layout/DetailSection.tsx
- apps/mobile/src/features/appointments/detail/components/layout/DetailSegmentBar.tsx
- apps/mobile/src/features/appointments/detail/components/layout/DetailTerminalBanner.tsx
- apps/mobile/src/features/appointments/detail/components/layout/RdvAppointmentInfoSection.tsx
- apps/mobile/src/features/appointments/detail/components/layout/RdvDetailHeaderStatus.tsx
- apps/mobile/src/features/appointments/detail/components/layout/RdvDetailHero.tsx
- apps/mobile/src/features/appointments/detail/components/layout/RdvDetailNavTitle.tsx
- apps/mobile/src/features/appointments/detail/components/layout/RdvDetailShareFooter.tsx
- apps/mobile/src/features/appointments/detail/components/offer/OfferAcceptPreparationOverlay.tsx
- apps/mobile/src/features/appointments/detail/components/offer/OfferAppointmentPreviewBody.tsx
- apps/mobile/src/features/appointments/detail/components/offer/OfferInfoRow.tsx
- apps/mobile/src/features/appointments/detail/components/offer/OfferLabPartnerSection.tsx
- apps/mobile/src/features/appointments/detail/components/patient/PatientAssigneeRows.tsx
- apps/mobile/src/features/appointments/detail/components/patient/PatientCareSection.tsx
- apps/mobile/src/features/appointments/detail/components/patient/PatientCompactHeader.tsx
- apps/mobile/src/features/appointments/detail/components/patient/PatientCompletedReviewPrompt.tsx
- apps/mobile/src/features/appointments/detail/components/patient/PatientDetailActions.tsx
- apps/mobile/src/features/appointments/detail/components/patient/PatientDetailHubCard.tsx
- apps/mobile/src/features/appointments/detail/components/patient/PatientDocumentsPanel.tsx
- apps/mobile/src/features/appointments/detail/components/patient/PatientEngagementSections.tsx
- apps/mobile/src/features/appointments/detail/components/patient/PatientInfoSection.tsx
- apps/mobile/src/features/appointments/detail/components/patient/PatientListPrimitives.tsx
- apps/mobile/src/features/appointments/detail/components/patient/PatientPaginationBar.tsx
- apps/mobile/src/features/appointments/detail/components/patient/PatientRdvUnifiedCard.tsx
- apps/mobile/src/features/appointments/detail/components/patient/PatientReviewPromptSheet.tsx
- apps/mobile/src/features/appointments/form/components/BookingActionBar.tsx
- apps/mobile/src/features/appointments/form/components/BookingAvailabilitySection.tsx
- apps/mobile/src/features/appointments/form/components/BookingCareSelectionHeaderTitle.tsx
- apps/mobile/src/features/appointments/form/components/BookingContinueButton.tsx
- apps/mobile/src/features/appointments/form/components/BookingDateCarousel.tsx
- apps/mobile/src/features/appointments/form/components/BookingPremiumStepCta.tsx
- apps/mobile/src/features/appointments/form/components/BookingTimeRangeSlider.tsx
- apps/mobile/src/features/appointments/form/components/BookingWizardChrome.tsx
- apps/mobile/src/features/appointments/form/components/BookingWizardHeaderClose.tsx
- apps/mobile/src/features/appointments/form/components/BookingWizardPreviousRecaps.tsx
- apps/mobile/src/features/appointments/form/components/BookingWizardProgress.tsx
- apps/mobile/src/features/appointments/form/components/BookingWizardSegmentContext.tsx
- apps/mobile/src/features/appointments/form/components/CareCategoryFilterBar.tsx
- apps/mobile/src/features/appointments/form/components/CareSelectionStep.tsx
- apps/mobile/src/features/appointments/form/components/CareServiceQuickOptionsSheet.tsx
- apps/mobile/src/features/appointments/form/components/CategoryPicker.tsx
- apps/mobile/src/features/appointments/form/components/FormAddressSection.tsx
- apps/mobile/src/features/appointments/form/components/FormCareFieldsSection.tsx
- apps/mobile/src/features/appointments/form/components/FormDocumentsSection.tsx
- apps/mobile/src/features/appointments/form/components/FormPatientSection.tsx
- apps/mobile/src/features/appointments/form/components/FormScheduleSection.tsx
- apps/mobile/src/features/appointments/form/components/LabBrandPreferenceStep.tsx
- apps/mobile/src/features/appointments/form/components/MissingPrescriptionAlert.tsx
- apps/mobile/src/features/appointments/form/components/PatientDuplicatePrompt.tsx
- apps/mobile/src/features/appointments/form/components/PatientSelectSheet.tsx
- apps/mobile/src/features/appointments/form/components/PreferredNurseGenderButtons.tsx
- apps/mobile/src/features/appointments/form/components/ProNurseAssignmentSection.tsx
- apps/mobile/src/features/appointments/form/components/RelativeQuickAddSheet.tsx
- apps/mobile/src/features/appointments/form/components/SelectedServicesDetailSheet.tsx
- apps/mobile/src/features/appointments/form/components/VipScheduledTimePicker.tsx
- apps/mobile/src/features/appointments/form/components/WizardDocumentFields.tsx
- apps/mobile/src/features/appointments/form/components/WizardPatientDocumentsPanel.tsx
- apps/mobile/src/features/appointments/form/hooks/useBookingWizardHeader.tsx
- apps/mobile/src/features/appointments/form/screens/AppointmentFormScreen.tsx
- apps/mobile/src/features/appointments/form/screens/BookingWizardScreen.tsx
- apps/mobile/src/features/appointments/form/screens/MultiAppointmentWizardScreen.tsx
- apps/mobile/src/features/appointments/patient-schedule/screens/PatientEditScheduleScreen.tsx
- apps/mobile/src/features/appointments/reschedule/components/RescheduleChoiceStep.tsx
- apps/mobile/src/features/appointments/reschedule/screens/RescheduleAppointmentScreen.tsx
- apps/mobile/src/features/appointments/screens/AppointmentConversationScreen.tsx
- apps/mobile/src/features/appointments/screens/AppointmentDetailScreen.tsx
- apps/mobile/src/features/appointments/screens/AppointmentListScreen.tsx
- apps/mobile/src/features/appointments/screens/AppointmentPrescriptionScreen.tsx
- apps/mobile/src/features/appointments/screens/CarePhotoDiscussionScreen.tsx
- apps/mobile/src/features/appointments/screens/PatientAppointmentDetailScreen.tsx
- apps/mobile/src/features/appointments/screens/PatientAppointmentHistoryScreen.tsx
- apps/mobile/src/features/appointments/screens/PreleveurAppointmentsListScreen.tsx
- apps/mobile/src/features/appointments/screens/RoleFilteredAppointmentsListScreen.tsx
- apps/mobile/src/features/auth/components/BiometricLoginButton.tsx
- apps/mobile/src/features/auth/components/ForcePasswordChangeModal.tsx
- apps/mobile/src/features/auth/components/ForgotPasswordPanel.tsx
- apps/mobile/src/features/auth/components/GenderSelect.tsx
- apps/mobile/src/features/auth/components/LoginBottomSheet.tsx
- apps/mobile/src/features/auth/components/LoginFlow.tsx
- apps/mobile/src/features/auth/components/MustChangePasswordGate.tsx
- apps/mobile/src/features/auth/components/ProEmploiSelect.tsx
- apps/mobile/src/features/auth/components/RegisterBottomSheet.tsx
- apps/mobile/src/features/auth/screens/RegisterMerciScreen.tsx
- apps/mobile/src/features/auth/screens/RegisterScreen.tsx
- apps/mobile/src/features/auth/screens/WelcomeScreen.tsx
- apps/mobile/src/features/calendar/components/CalendarFilterSheet.tsx
- apps/mobile/src/features/calendar/screens/CalendarScreen.tsx
- apps/mobile/src/features/documents/components/DocumentDownloadButton.tsx
- apps/mobile/src/features/documents/components/MedicalDocumentPreviewModal.tsx
- apps/mobile/src/features/documents/components/medical-documents-stack.tsx
- apps/mobile/src/features/health-record/components/ClinicalVitalEditSheet.tsx
- apps/mobile/src/features/health-record/components/ClinicalVitalHistorySheet.tsx
- apps/mobile/src/features/health-record/components/ClinicalVitalsPanel.tsx
- apps/mobile/src/features/health-record/components/HealthRecordFieldRow.tsx
- apps/mobile/src/features/health-record/components/HealthRecordGapActionCard.tsx
- apps/mobile/src/features/health-record/components/HealthRecordProgressRing.tsx
- apps/mobile/src/features/health-record/components/HealthRecordPromptCard.tsx
- apps/mobile/src/features/health-record/components/HealthRecordQuestionStep.tsx
- apps/mobile/src/features/health-record/components/HealthRecordSectionEmoji.tsx
- apps/mobile/src/features/health-record/components/HealthRecordSectionProgress.tsx
- apps/mobile/src/features/health-record/components/HealthRecordSectionRecap.tsx
- apps/mobile/src/features/health-record/screens/HealthRecordRecapScreen.tsx
- apps/mobile/src/features/health-record/screens/HealthRecordWizardScreen.tsx
- apps/mobile/src/features/health-record/screens/StaffHealthRecordScreen.tsx
- apps/mobile/src/features/health-sync/components/HealthActivityHero.tsx
- apps/mobile/src/features/health-sync/components/HealthConnectOnboarding.tsx
- apps/mobile/src/features/health-sync/components/HealthDataEmptyPanel.tsx
- apps/mobile/src/features/health-sync/components/HealthInsightCards.tsx
- apps/mobile/src/features/health-sync/components/HealthMetricChart.tsx
- apps/mobile/src/features/health-sync/components/HealthSourceConnectCard.tsx
- apps/mobile/src/features/health-sync/components/HealthSyncStatusCard.tsx
- apps/mobile/src/features/health-sync/screens/HealthDataScreen.tsx
- apps/mobile/src/features/help/screens/HelpFaqTopicScreen.tsx
- apps/mobile/src/features/help/screens/HelpScreen.tsx
- apps/mobile/src/features/help/screens/SupportScreen.tsx
- apps/mobile/src/features/lab-results/components/LabResultListCard.tsx
- apps/mobile/src/features/lab-results/components/LabResultsFeed.tsx
- apps/mobile/src/features/lab-results/screens/LabResultsScreen.tsx
- apps/mobile/src/features/legal/screens/LegalInformationScreen.tsx
- apps/mobile/src/features/notifications/components/NotificationCard.tsx
- apps/mobile/src/features/notifications/components/NotificationsFeed.tsx
- apps/mobile/src/features/notifications/components/NotificationsReadAllAction.tsx
- apps/mobile/src/features/notifications/screens/NotificationsScreen.tsx
- apps/mobile/src/features/nurse-passage/components/IsoDatePicker.tsx
- apps/mobile/src/features/nurse-passage/components/PassageCareSection.tsx
- apps/mobile/src/features/nurse-passage/components/PassageDetailActionsSheet.tsx
- apps/mobile/src/features/nurse-passage/components/PassageDetailDocumentsPanel.tsx
- apps/mobile/src/features/nurse-passage/components/PassageFab.tsx
- apps/mobile/src/features/nurse-passage/components/PassageFormCareSheet.tsx
- apps/mobile/src/features/nurse-passage/components/PassageFormDailyTimesSheet.tsx
- apps/mobile/src/features/nurse-passage/components/PassageFormDocumentsPanel.tsx
- apps/mobile/src/features/nurse-passage/components/PassageFormDurationSheet.tsx
- apps/mobile/src/features/nurse-passage/components/PassageFormFieldRow.tsx
- apps/mobile/src/features/nurse-passage/components/PassageFormHealthRecordPanel.tsx
- apps/mobile/src/features/nurse-passage/components/PassageFormHealthRecordSectionSheet.tsx
- apps/mobile/src/features/nurse-passage/components/PassageFormLocationSheet.tsx
- apps/mobile/src/features/nurse-passage/components/PassageFormNotesSheet.tsx
- apps/mobile/src/features/nurse-passage/components/PassageFormPlanningSheet.tsx
- apps/mobile/src/features/nurse-passage/components/PassageFormTimeSheet.tsx
- apps/mobile/src/features/nurse-passage/components/PassageMultiDateCalendar.tsx
- apps/mobile/src/features/nurse-passage/components/PassagePlanningSection.tsx
- apps/mobile/src/features/nurse-passage/components/PassagePlanningSheet.tsx
- apps/mobile/src/features/nurse-passage/components/PassageSimpleListRow.tsx
- apps/mobile/src/features/nurse-passage/components/PassageTimePicker.tsx
- apps/mobile/src/features/nurse-passage/components/PassageWeekdayChips.tsx
- apps/mobile/src/features/nurse-passage/components/TourViewTabs.tsx
- apps/mobile/src/features/nurse-passage/hooks/use-passage-prescription-gaps-alert.tsx
- apps/mobile/src/features/nurse-passage/screens/PassageDetailScreen.tsx
- apps/mobile/src/features/nurse-passage/screens/PassageFormScreen.tsx
- apps/mobile/src/features/nurse-passage/screens/PassagePatientPickScreen.tsx
- apps/mobile/src/features/nurse/components/BookAppointmentCta.tsx
- apps/mobile/src/features/nurse/components/NurseDemandesOfferCard.tsx
- apps/mobile/src/features/nurse/components/NurseTourBanner.tsx
- apps/mobile/src/features/nurse/components/PlanLimitsBanner.tsx
- apps/mobile/src/features/nurse/components/SubscriptionPlanCard.tsx
- apps/mobile/src/features/nurse/screens/NurseAppointmentsListScreen.tsx
- apps/mobile/src/features/nurse/screens/NurseDemandesScreen.tsx
- apps/mobile/src/features/nurse/screens/NurseReviewsScreen.tsx
- apps/mobile/src/features/nurse/screens/NurseSubscriptionScreen.tsx
- apps/mobile/src/features/onboarding/components/TutorialIllustration.tsx
- apps/mobile/src/features/onboarding/screens/TutorialCarouselScreen.tsx
- apps/mobile/src/features/patient-absence/components/PatientAbsenceSheet.tsx
- apps/mobile/src/features/patient-relatives/components/PatientRelativeFormSheet.tsx
- apps/mobile/src/features/patient-relatives/screens/PatientRelativeDetailScreen.tsx
- apps/mobile/src/features/patient-relatives/screens/PatientRelativeDocumentsScreen.tsx
- apps/mobile/src/features/patient/screens/PatientAppointmentsListScreen.tsx
- apps/mobile/src/features/patient/screens/PatientRelativesScreen.tsx
- apps/mobile/src/features/patient/screens/PatientReviewsScreen.tsx
- apps/mobile/src/features/patients/components/CreatePatientModal.tsx
- apps/mobile/src/features/patients/components/StaffPatientBookingConsentRow.tsx
- apps/mobile/src/features/patients/components/StaffPatientEditSheet.tsx
- apps/mobile/src/features/patients/components/StaffPatientHubListRow.tsx
- apps/mobile/src/features/patients/screens/PatientDetailScreen.tsx
- apps/mobile/src/features/patients/screens/PatientsListScreen.tsx
- apps/mobile/src/features/patients/screens/StaffPatientDocumentsScreen.tsx
- apps/mobile/src/features/patients/screens/StaffPatientHistoryScreen.tsx
- apps/mobile/src/features/prescriptions/components/NursePrescriptionScopeHelp.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionAppointmentPicker.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionAppointmentPickerRow.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionAppointmentSelectField.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionAppointmentSelectSheet.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionComposer.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionComposerAwaitingRdv.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionDatePicker.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionHistoryCard.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionLinkModeTabs.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionPatientSelectField.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionPatientSelectSheet.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionProfileGapsAlert.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionRdvContextRow.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionRdvScheduleRow.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionSignaturePad.tsx
- apps/mobile/src/features/prescriptions/components/PrescriptionSignatureSheet.tsx
- apps/mobile/src/features/prescriptions/screens/PatientPrescriptionsScreen.tsx
- apps/mobile/src/features/prescriptions/screens/PrescriptionWorkspaceScreen.tsx
- apps/mobile/src/features/prescriptions/screens/PrescriptionsScreen.tsx
- apps/mobile/src/features/pro/screens/ProDashboardScreen.tsx
- apps/mobile/src/features/profile/components/CoverageMapLive.tsx
- apps/mobile/src/features/profile/components/CoverageMapPreview.tsx
- apps/mobile/src/features/profile/components/CoverageRadiusControl.tsx
- apps/mobile/src/features/profile/components/CoverageSquareMapLive.tsx
- apps/mobile/src/features/profile/components/MoreMenuItem.tsx
- apps/mobile/src/features/profile/components/MoreMenuSection.tsx
- apps/mobile/src/features/profile/components/MoreProfileCard.tsx
- apps/mobile/src/features/profile/components/PasswordManagementPanel.tsx
- apps/mobile/src/features/profile/components/ProfessionalProfileSheet.tsx
- apps/mobile/src/features/profile/components/ProfileCareTypesSection.tsx
- apps/mobile/src/features/profile/components/ProfileCoverageEditor.tsx
- apps/mobile/src/features/profile/components/ProfileDocumentsPremiumPanel.tsx
- apps/mobile/src/features/profile/components/ProfileDocumentsSection.tsx
- apps/mobile/src/features/profile/components/ProfileHero.tsx
- apps/mobile/src/features/profile/components/ProfileImagesBlock.tsx
- apps/mobile/src/features/profile/components/ProfileLoadState.tsx
- apps/mobile/src/features/profile/components/ProfileNavCard.tsx
- apps/mobile/src/features/profile/components/ProfileNavRow.tsx
- apps/mobile/src/features/profile/components/ProfileNurseQualificationsSection.tsx
- apps/mobile/src/features/profile/components/ProfilePersonalForm.tsx
- apps/mobile/src/features/profile/components/ProfilePhotosSection.tsx
- apps/mobile/src/features/profile/components/ProfilePhotosSheetContent.tsx
- apps/mobile/src/features/profile/components/ProfilePrescriptionSignatureSection.tsx
- apps/mobile/src/features/profile/components/ProfileSection.tsx
- apps/mobile/src/features/profile/components/ProfileSecurityLinkRow.tsx
- apps/mobile/src/features/profile/components/ProfileToggleRow.tsx
- apps/mobile/src/features/profile/components/ProviderPublicProfileSheet.tsx
- apps/mobile/src/features/profile/screens/ProfileCoverageScreen.tsx
- apps/mobile/src/features/profile/screens/ProfileDocumentsScreen.tsx
- apps/mobile/src/features/profile/screens/ProfileHubScreen.tsx
- apps/mobile/src/features/profile/screens/ProfilePersonalScreen.tsx
- apps/mobile/src/features/profile/screens/ProfilePreferencesScreen.tsx
- apps/mobile/src/features/profile/screens/ProfileScreen.tsx
- apps/mobile/src/features/profile/screens/ProfileSecurityScreen.tsx
- apps/mobile/src/features/profile/screens/ProfileSubScreenLayout.tsx
- apps/mobile/src/features/profile/screens/RoleMoreTabScreen.tsx
- apps/mobile/src/features/profile/screens/nurse/ProfileNurseCareTypesScreen.tsx
- apps/mobile/src/features/profile/screens/nurse/ProfileNurseCoordinatesScreen.tsx
- apps/mobile/src/features/profile/screens/nurse/ProfileNurseCoverageScreen.tsx
- apps/mobile/src/features/profile/screens/nurse/ProfileNursePresentationScreen.tsx
- apps/mobile/src/features/profile/screens/nurse/ProfileNurseQualificationsScreen.tsx
- apps/mobile/src/features/profile/screens/nurse/ProfileNurseSettingsScreen.tsx
- apps/mobile/src/features/profile/views/ProfileNurseHubView.tsx
- apps/mobile/src/features/profile/views/ProfileNurseView.tsx
- apps/mobile/src/features/profile/views/ProfilePatientView.tsx
- apps/mobile/src/features/profile/views/ProfilePreleveurView.tsx
- apps/mobile/src/features/profile/views/ProfileProView.tsx
- apps/mobile/src/features/qr/screens/QrCodeScreen.tsx
- apps/mobile/src/features/reviews/components/RatingStars.tsx
- apps/mobile/src/features/reviews/components/ReviewFilterChips.tsx
- apps/mobile/src/features/reviews/components/ReviewGivenCard.tsx
- apps/mobile/src/features/reviews/components/ReviewReceivedCard.tsx
- apps/mobile/src/features/reviews/components/ReviewReplySheet.tsx
- apps/mobile/src/features/reviews/components/ReviewStars.tsx
- apps/mobile/src/features/reviews/components/ReviewStatsBanner.tsx
- apps/mobile/src/features/settings/screens/AppSettingsScreen.tsx
- apps/mobile/src/features/tournee-nurse/components/TourCalendarExportAction.tsx
- apps/mobile/src/features/tournee-nurse/components/TourCalendarImportSheet.tsx
- apps/mobile/src/features/tournee-nurse/components/TourDayStrip.tsx
- apps/mobile/src/features/tournee-nurse/components/TourEmptyPanel.tsx
- apps/mobile/src/features/tournee-nurse/components/TourLoadingSkeleton.tsx
- apps/mobile/src/features/tournee-nurse/components/TourLocateAction.tsx
- apps/mobile/src/features/tournee-nurse/components/TourPassageSectionHeader.tsx
- apps/mobile/src/features/tournee-nurse/components/TourSlotSectionLabel.tsx
- apps/mobile/src/features/tournee-nurse/components/TourSortFilterSheet.tsx
- apps/mobile/src/features/tournee-nurse/components/TourStopCard.tsx
- apps/mobile/src/features/tournee-nurse/components/TourStopCareSection.tsx
- apps/mobile/src/features/tournee-nurse/components/TourStopCompletedStamp.tsx
- apps/mobile/src/features/tournee-nurse/components/TourStopReorderControls.tsx
- apps/mobile/src/features/tournee-nurse/components/TourStopRescheduleSheet.tsx
- apps/mobile/src/features/tournee-nurse/components/TourStopRouteChip.tsx
- apps/mobile/src/features/tournee-nurse/components/TourSummaryCard.tsx
- apps/mobile/src/features/tournee-nurse/screens/NurseTourneeScreen.tsx
- apps/mobile/src/features/tournee/screens/TourneeScreen.tsx
- apps/mobile/src/navigation/HeaderActionButton.tsx
- apps/mobile/src/navigation/HeaderBackButton.tsx
- apps/mobile/src/navigation/HeaderGreeting.tsx
- apps/mobile/src/navigation/HeaderLogo.tsx
- apps/mobile/src/navigation/HeaderNotificationButton.tsx
- apps/mobile/src/navigation/HeaderTitle.tsx
- apps/mobile/src/navigation/PatientFolderHeaderTitle.tsx
- apps/mobile/src/navigation/ProfileStackBackButton.tsx
- apps/mobile/src/navigation/RegisterHeaderTitle.tsx
- apps/mobile/src/navigation/StackChromeScreen.tsx
- apps/mobile/src/navigation/StackGlassBackButton.tsx
- apps/mobile/src/navigation/StackHeaderBackButton.tsx
- apps/mobile/src/navigation/StackSceneInsetLayout.tsx
- apps/mobile/src/navigation/resolve-stack-header-node.tsx
- apps/mobile/src/navigation/stack-header-catalog.tsx
- apps/mobile/src/navigation/tab-screen-frames.tsx
- apps/mobile/src/providers/AppProviders.tsx
- apps/mobile/src/providers/AppThemeProvider.tsx
- apps/mobile/src/providers/ExpoRouterThemeProvider.tsx
- apps/mobile/src/providers/NetworkProvider.tsx
- apps/mobile/src/providers/ToastProvider.tsx
- apps/mobile/src/theme/AppText.tsx
