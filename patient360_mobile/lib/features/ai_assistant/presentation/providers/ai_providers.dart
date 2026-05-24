// ============================================================================
// AI Assistant Providers - Patient 360 Mobile
// Triage controller + Specialist controller + Emergency reports history
// ============================================================================

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/ai_repository.dart';
import '../../data/location_helper.dart';
import '../../domain/emergency_location.dart';
import '../../domain/emergency_report.dart';
import '../../domain/specialist_result.dart';

// Type aliases - keeps generic types on a SINGLE line so encoding/wrapping
// issues from text editors cannot break the parser.
typedef _EmergencyReportsList = List<EmergencyReport>;
typedef _ReportsState = AsyncValue<_EmergencyReportsList>;
typedef _TriageState = AsyncValue<EmergencyReport?>;
typedef _SpecialistState = AsyncValue<SpecialistResult?>;

// Strategy provider for location resolution.
final Provider<LocationHelper> locationHelperProvider =
    Provider<LocationHelper>((Ref ref) => const GeolocatorLocationHelper());

// ============================================================================
// Specialist
// ============================================================================

class SpecialistController extends AsyncNotifier<SpecialistResult?> {
  @override
  Future<SpecialistResult?> build() async => null;

  Future<void> submit(String symptoms) async {
    state = const _SpecialistState.loading();
    state = await AsyncValue.guard<SpecialistResult?>(
      () => ref.read(aiRepositoryProvider).analyzeSymptoms(symptoms: symptoms),
    );
  }

  void clear() {
    state = const _SpecialistState.data(null);
  }
}

final specialistControllerProvider =
    AsyncNotifierProvider<SpecialistController, SpecialistResult?>(
      SpecialistController.new,
    );

// ============================================================================
// Triage - text / image / voice
// ============================================================================

class TriageController extends AsyncNotifier<EmergencyReport?> {
  @override
  Future<EmergencyReport?> build() async => null;

  Future<EmergencyReport?> submitText(String text) async {
    return _submit(inputType: 'text', textDescription: text);
  }

  Future<EmergencyReport?> submitImage(
    XFile image, {
    String? textDescription,
  }) async {
    final bool hasText =
        textDescription != null && textDescription.trim().isNotEmpty;
    return _submit(
      inputType: hasText ? 'combined' : 'image',
      textDescription: hasText ? textDescription : null,
      imageFile: image,
    );
  }

  Future<EmergencyReport?> submitVoice(XFile audio) async {
    return _submit(inputType: 'voice', audioFile: audio);
  }

  Future<EmergencyReport?> _submit({
    required String inputType,
    String? textDescription,
    XFile? imageFile,
    XFile? audioFile,
  }) async {
    state = const _TriageState.loading();

    // Try GPS first, fall back to patient's registered governorate.
    // Submission NEVER fails for missing location.
    final String? governorate = ref
        .read(authControllerProvider)
        .value
        ?.person
        ?.governorate;

    final EmergencyLocation loc = await ref
        .read(locationHelperProvider)
        .getLocationOrGovernorateFallback(governorate: governorate);

    state = await AsyncValue.guard<EmergencyReport?>(
      () => ref
          .read(aiRepositoryProvider)
          .submitEmergencyReport(
            inputType: inputType,
            textDescription: textDescription,
            imageFile: imageFile,
            audioFile: audioFile,
            location: loc,
          ),
    );

    final EmergencyReport? report = state.value;
    if (report != null) {
      // ignore: unawaited_futures
      ref.read(emergencyReportsProvider.notifier).refresh();
    }
    return report;
  }

  void clear() {
    state = const _TriageState.data(null);
  }
}

final triageControllerProvider =
    AsyncNotifierProvider<TriageController, EmergencyReport?>(
      TriageController.new,
    );

// ============================================================================
// Emergency reports history
// ============================================================================

class EmergencyReportsController extends AsyncNotifier<_EmergencyReportsList> {
  @override
  Future<_EmergencyReportsList> build() async {
    return ref.read(aiRepositoryProvider).getEmergencyReports();
  }

  Future<void> refresh() async {
    state = const _ReportsState.loading();
    state = await AsyncValue.guard<_EmergencyReportsList>(
      () => ref.read(aiRepositoryProvider).getEmergencyReports(),
    );
  }
}

final emergencyReportsProvider =
    AsyncNotifierProvider<EmergencyReportsController, _EmergencyReportsList>(
      EmergencyReportsController.new,
    );
