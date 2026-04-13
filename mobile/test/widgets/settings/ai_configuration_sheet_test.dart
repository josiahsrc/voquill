import 'package:app/widgets/settings/ai_configuration_sheet.dart';
import 'package:app/model/api_key_model.dart';
import 'package:app/utils/channel_utils.dart' as channel_utils;
import 'package:flutter/services.dart';
import 'package:app/widgets/settings/api_key_list_widget.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('com.voquill.mobile/shared');

  Map<String, Object?> localModel({
    required String slug,
    required String label,
    required String helper,
    required int sizeBytes,
    required String languageSupport,
    required bool downloaded,
    required bool valid,
    required bool selected,
    double? downloadProgress,
    String? validationError,
  }) {
    return {
      'slug': slug,
      'label': label,
      'helper': helper,
      'sizeBytes': sizeBytes,
      'languageSupport': languageSupport,
      'downloaded': downloaded,
      'valid': valid,
      'selected': selected,
      if (downloadProgress != null) 'downloadProgress': downloadProgress,
      if (validationError != null) 'validationError': validationError,
    };
  }

  Future<void> pumpSheet(
    WidgetTester tester,
    AiConfigContext configContext,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AiConfigurationSheet(configContext: configContext),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  tearDown(() {
    channel_utils.debugSetCanSyncOverride(null);
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  testWidgets('transcription settings expose a distinct local mode panel', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'ai_transcription_mode': AiMode.local.name,
    });

    final calls = <MethodCall>[];
    channel_utils.debugSetCanSyncOverride(true);
    final models = [
      localModel(
        slug: 'tiny',
        label: 'Whisper Tiny',
        helper: 'Fastest, lowest accuracy',
        sizeBytes: 77000000,
        languageSupport: 'multilingual',
        downloaded: true,
        valid: true,
        selected: true,
      ),
      localModel(
        slug: 'base',
        label: 'Whisper Base',
        helper: 'Great balance of speed and accuracy',
        sizeBytes: 148000000,
        languageSupport: 'englishOnly',
        downloaded: true,
        valid: true,
        selected: false,
      ),
      localModel(
        slug: 'small',
        label: 'Whisper Small',
        helper: 'Recommended with GPU acceleration',
        sizeBytes: 488000000,
        languageSupport: 'multilingual',
        downloaded: true,
        valid: false,
        selected: false,
        validationError: 'Checksum mismatch',
      ),
      localModel(
        slug: 'large',
        label: 'Whisper Large v3',
        helper: 'Highest accuracy, requires GPU',
        sizeBytes: 3100000000,
        languageSupport: 'multilingual',
        downloaded: false,
        valid: false,
        selected: false,
      ),
    ];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          if (call.method == 'listLocalTranscriptionModels') {
            return models;
          }
          return null;
        });

    await pumpSheet(tester, AiConfigContext.transcription);

    expect(find.text('Local'), findsOneWidget);
    expect(find.text('Whisper Tiny'), findsOneWidget);
    expect(find.text('Fastest, lowest accuracy'), findsOneWidget);
    expect(find.text('73.43 MB'), findsOneWidget);
    expect(find.text('English only'), findsOneWidget);
    expect(find.text('Multilingual'), findsNWidgets(3));
    expect(find.text('Checksum mismatch'), findsOneWidget);
    expect(find.text('Selected'), findsOneWidget);
    expect(find.text('Select'), findsOneWidget);
    expect(find.text('Download'), findsOneWidget);
    expect(find.text('Delete'), findsNWidgets(3));
    expect(find.byType(ApiKeyListWidget), findsNothing);
    expect(
      calls.where((call) => call.method == 'listLocalTranscriptionModels'),
      isNotEmpty,
    );
  });

  testWidgets(
    'selecting local loads models and choosing a model updates selection',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'ai_transcription_mode': AiMode.cloud.name,
      });

      channel_utils.debugSetCanSyncOverride(true);
      final calls = <MethodCall>[];
      var models = <Map<String, Object?>>[
        localModel(
          slug: 'tiny',
          label: 'Whisper Tiny',
          helper: 'Fastest, lowest accuracy',
          sizeBytes: 77000000,
          languageSupport: 'multilingual',
          downloaded: true,
          valid: true,
          selected: true,
        ),
        localModel(
          slug: 'base',
          label: 'Whisper Base',
          helper: 'Great balance of speed and accuracy',
          sizeBytes: 148000000,
          languageSupport: 'englishOnly',
          downloaded: true,
          valid: true,
          selected: false,
        ),
      ];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            calls.add(call);
            if (call.method == 'listLocalTranscriptionModels') {
              return models;
            }
            if (call.method == 'selectLocalTranscriptionModel') {
              final slug = (call.arguments as Map)['slug'] as String;
              models = [
                for (final model in models)
                  {...model, 'selected': model['slug'] == slug},
              ];
            }
            return null;
          });

      await pumpSheet(tester, AiConfigContext.transcription);

      expect(find.text('Voquill Cloud'), findsOneWidget);

      await tester.tap(find.text('Local'));
      await tester.pumpAndSettle();

      expect(find.text('Whisper Base'), findsOneWidget);
      expect(
        calls.where((call) => call.method == 'listLocalTranscriptionModels'),
        isNotEmpty,
      );

      final selectButton = find.widgetWithText(FilledButton, 'Select');
      await tester.scrollUntilVisible(
        selectButton,
        100,
        scrollable: find.byType(Scrollable).first,
      );
      tester.widget<FilledButton>(selectButton).onPressed!.call();
      await tester.pumpAndSettle();

      final baseCard = find.ancestor(
        of: find.text('Whisper Base'),
        matching: find.byType(Card),
      );
      final tinyCard = find.ancestor(
        of: find.text('Whisper Tiny'),
        matching: find.byType(Card),
      );

      expect(find.text('Selected'), findsOneWidget);
      expect(find.text('Currently selected'), findsOneWidget);
      expect(
        find.descendant(of: baseCard, matching: find.text('Selected')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: tinyCard, matching: find.text('Selected')),
        findsNothing,
      );
      expect(
        calls.where((call) => call.method == 'selectLocalTranscriptionModel'),
        hasLength(1),
      );
    },
  );

  testWidgets(
    'deleting the selected local model falls back to the next downloaded model',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'ai_transcription_mode': AiMode.local.name,
      });

      channel_utils.debugSetCanSyncOverride(true);
      final calls = <MethodCall>[];
      var models = <Map<String, Object?>>[
        localModel(
          slug: 'tiny',
          label: 'Whisper Tiny',
          helper: 'Fastest, lowest accuracy',
          sizeBytes: 77000000,
          languageSupport: 'multilingual',
          downloaded: true,
          valid: true,
          selected: true,
        ),
        localModel(
          slug: 'base',
          label: 'Whisper Base',
          helper: 'Great balance of speed and accuracy',
          sizeBytes: 148000000,
          languageSupport: 'englishOnly',
          downloaded: true,
          valid: true,
          selected: false,
        ),
      ];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            calls.add(call);
            if (call.method == 'listLocalTranscriptionModels') {
              return models;
            }
            if (call.method == 'deleteLocalTranscriptionModel') {
              models = [
                {
                  ...models.first,
                  'downloaded': false,
                  'valid': false,
                  'selected': false,
                },
                models.last,
              ];
            }
            if (call.method == 'selectLocalTranscriptionModel') {
              final slug = (call.arguments as Map)['slug'] as String;
              models = [
                for (final model in models)
                  {...model, 'selected': model['slug'] == slug},
              ];
            }
            return null;
          });

      await pumpSheet(tester, AiConfigContext.transcription);

      final tinyCard = find.ancestor(
        of: find.text('Whisper Tiny'),
        matching: find.byType(Card),
      );
      await tester.tap(
        find.descendant(
          of: tinyCard,
          matching: find.widgetWithText(TextButton, 'Delete'),
        ),
      );
      await tester.pumpAndSettle();

      final baseCard = find.ancestor(
        of: find.text('Whisper Base'),
        matching: find.byType(Card),
      );
      expect(
        find.descendant(of: baseCard, matching: find.text('Selected')),
        findsOneWidget,
      );
      expect(
        calls.where((call) => call.method == 'selectLocalTranscriptionModel'),
        hasLength(1),
      );
    },
  );

  testWidgets(
    'local settings show unavailable state when native model lookup fails',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'ai_transcription_mode': AiMode.local.name,
      });
      channel_utils.debugSetCanSyncOverride(false);

      await pumpSheet(tester, AiConfigContext.transcription);

      expect(
        find.text('Local models are unavailable on this device right now.'),
        findsOneWidget,
      );
      expect(find.text('No local models available right now.'), findsNothing);
    },
  );

  testWidgets(
    'local settings show unavailable state when native listing errors',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'ai_transcription_mode': AiMode.local.name,
      });
      channel_utils.debugSetCanSyncOverride(true);
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            if (call.method == 'listLocalTranscriptionModels') {
              throw PlatformException(code: 'NATIVE_FAILURE');
            }
            return null;
          });

      await pumpSheet(tester, AiConfigContext.transcription);

      expect(
        find.text('Local models are unavailable on this device right now.'),
        findsOneWidget,
      );
      expect(find.text('No local models available right now.'), findsNothing);
    },
  );

  testWidgets('failed local model selection shows explicit error', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'ai_transcription_mode': AiMode.local.name,
    });
    channel_utils.debugSetCanSyncOverride(true);

    final calls = <MethodCall>[];
    final models = <Map<String, Object?>>[
      localModel(
        slug: 'tiny',
        label: 'Whisper Tiny',
        helper: 'Fastest, lowest accuracy',
        sizeBytes: 77000000,
        languageSupport: 'multilingual',
        downloaded: true,
        valid: true,
        selected: false,
      ),
    ];

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          if (call.method == 'listLocalTranscriptionModels') {
            return models;
          }
          if (call.method == 'selectLocalTranscriptionModel') {
            return false;
          }
          return null;
        });

    await pumpSheet(tester, AiConfigContext.transcription);

    final selectButton = find.widgetWithText(FilledButton, 'Select');
    tester.widget<FilledButton>(selectButton).onPressed!.call();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(
      find.text('Could not select this model. Try again.'),
      findsOneWidget,
    );
    expect(
      calls.where((call) => call.method == 'selectLocalTranscriptionModel'),
      hasLength(1),
    );
  });

  testWidgets('post-processing settings keep cloud and api key modes only', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});

    await pumpSheet(tester, AiConfigContext.postProcessing);

    expect(find.text('Cloud'), findsOneWidget);
    expect(find.text('API Key'), findsOneWidget);
    expect(find.text('Local'), findsNothing);
  });

  testWidgets('post-processing settings show invalid local state explicitly', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'ai_post_processing_mode': AiMode.local.name,
    });

    await pumpSheet(tester, AiConfigContext.postProcessing);

    expect(find.text('Local post-processing is unavailable'), findsOneWidget);
    expect(find.text('Choose Cloud or API Key to continue.'), findsOneWidget);
    expect(find.byType(ApiKeyListWidget), findsNothing);
  });
}
