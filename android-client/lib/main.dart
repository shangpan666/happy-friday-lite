import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'screens/login_screen.dart';
import 'screens/notes_screen.dart';
import 'services/api_client.dart';
import 'services/secure_storage.dart';

const MethodChannel _deepLinkChannel = MethodChannel('com.happyfriday/deeplink');

/// 全局 Deep Link 事件流，供各页面监听
final StreamController<Map<String, String>> deepLinkStreamController =
    StreamController<Map<String, String>>.broadcast();
Stream<Map<String, String>> get deepLinkStream => deepLinkStreamController.stream;

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  ErrorWidget.builder = (FlutterErrorDetails details) {
    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Text(
          '出错了:\n${details.exception}\n\n${details.stack}',
          style: const TextStyle(color: Colors.red, fontSize: 12),
        ),
      ),
    );
  };
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.dumpErrorToConsole(details);
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    FlutterError.dumpErrorToConsole(
      FlutterErrorDetails(exception: error, stack: stack as StackTrace?),
    );
    return true;
  };

  // 监听热启动时的 Deep Link 回调
  _deepLinkChannel.setMethodCallHandler((call) async {
    if (call.method == 'onDeepLink') {
      final data = Map<String, String>.from(call.arguments as Map);
      deepLinkStreamController.add(data);
    }
  });

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Phronesis 安卓端',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const EntryPoint(),
    );
  }
}

class EntryPoint extends StatefulWidget {
  const EntryPoint({super.key});

  @override
  State<EntryPoint> createState() => _EntryPointState();
}

class _EntryPointState extends State<EntryPoint> {
  final _storage = const FlutterSecureStorage();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkLogin());
  }

  Future<void> _checkLogin() async {
    try {
      // 先检查是否有冷启动 Deep Link
      final initialLink = await _deepLinkChannel.invokeMethod<Map>('getInitialLink');
      if (initialLink != null && initialLink.isNotEmpty) {
        final server = initialLink['server'] ?? '';
        final token = initialLink['token'] ?? '';
        if (server.isNotEmpty && token.isNotEmpty) {
          await SecureStorage.saveSession(
            serverUrl: ApiClient.normalizeUrl(server),
            token: token,
            username: initialLink['username'] ?? '',
            deviceId: initialLink['deviceId'],
            role: initialLink['role'],
          );
          if (!mounted) return;
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const NotesScreen()),
          );
          return;
        }
      }

      final token = await _storage.read(key: kTokenKey);
      final server = await _storage.read(key: kServerUrlKey);
      if (!mounted) return;
      if (token != null && token.isNotEmpty && server != null && server.isNotEmpty) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const NotesScreen()),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        );
      }
    } catch (e, st) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
