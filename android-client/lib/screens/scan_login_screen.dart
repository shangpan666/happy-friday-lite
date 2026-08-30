import 'dart:async';
import 'package:flutter/material.dart';
import '../main.dart';
import '../services/api_client.dart';
import '../services/secure_storage.dart';
import 'notes_screen.dart';

class ScanLoginScreen extends StatefulWidget {
  const ScanLoginScreen({super.key});

  @override
  State<ScanLoginScreen> createState() => _ScanLoginScreenState();
}

class _ScanLoginScreenState extends State<ScanLoginScreen> {
  StreamSubscription<Map<String, String>>? _sub;
  bool _handling = false;
  String? _status;

  @override
  void initState() {
    super.initState();
    _sub = deepLinkStream.listen(_onDeepLink);
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  void _onDeepLink(Map<String, String> data) async {
    if (_handling) return;
    final server = data['server'] ?? '';
    final token = data['token'] ?? '';
    if (server.isEmpty || token.isEmpty) return;

    setState(() {
      _handling = true;
      _status = '正在登录...';
    });

    try {
      await SecureStorage.saveSession(
        serverUrl: ApiClient.normalizeUrl(server),
        token: token,
        username: data['username'] ?? '',
        deviceId: data['deviceId'],
        role: data['role'],
      );
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const NotesScreen()),
        (_) => false,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _status = '登录失败：$e';
        _handling = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('扫码登录')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.qr_code_scanner,
                size: 80,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 24),
              const Text(
                '使用手机相机扫描电脑端二维码',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              const Text(
                '扫描后在弹出的链接上点击，即可自动登录 App。',
                style: TextStyle(color: Colors.grey, fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                '步骤：\n1. 打开手机「相机」应用\n2. 对准电脑端的二维码\n3. 点击屏幕上的链接\n4. 自动跳转完成登录',
                style: TextStyle(color: Colors.grey, fontSize: 13),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              if (_handling) ...[
                const CircularProgressIndicator(),
                const SizedBox(height: 12),
                Text(_status ?? '', style: const TextStyle(color: Colors.green)),
              ] else if (_status != null) ...[
                Text(_status!, style: const TextStyle(color: Colors.red)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
