import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/secure_storage.dart';
import 'notes_screen.dart';

class ScanLoginScreen extends StatefulWidget {
  const ScanLoginScreen({super.key});

  @override
  State<ScanLoginScreen> createState() => _ScanLoginScreenState();
}

class _ScanLoginScreenState extends State<ScanLoginScreen> {
  final _manualCtrl = TextEditingController();
  bool _handling = false;
  String? _error;

  @override
  void dispose() {
    _manualCtrl.dispose();
    super.dispose();
  }

  Future<void> _loginWithJson(String raw) async {
    Map<String, dynamic> data;
    try {
      data = jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = '格式无效，需要 JSON');
      return;
    }

    final server = data['server']?.toString();
    final user = data['user']?.toString();
    final pass = data['pass']?.toString();
    if (server == null || user == null || pass == null) {
      if (!mounted) return;
      setState(() => _error = 'JSON 缺少 server/user/pass 字段');
      return;
    }

    setState(() {
      _handling = true;
      _error = null;
    });

    try {
      final base = ApiClient.normalizeUrl(server);
      final result = await ApiClient.login(base, user, pass);
      await SecureStorage.saveSession(
        serverUrl: base,
        token: result['token'],
        username: result['username'] ?? user,
        deviceId: result['deviceId'],
        role: result['role'],
      );
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const NotesScreen()),
        (_) => false,
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = '登录失败：${e.message}';
        _handling = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = '网络错误：$e';
        _handling = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('扫码登录')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Icon(Icons.qr_code_scanner, size: 80, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              '请将电脑端显示的二维码内容粘贴到下方',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _manualCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: '粘贴 JSON 内容\n{"server":"http://...","user":"xxx","pass":"xxx"}',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            ElevatedButton(
              onPressed: _handling ? null : () => _loginWithJson(_manualCtrl.text.trim()),
              child: _handling
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('登录'),
            ),
          ],
        ),
      ),
    );
  }
}
