import 'dart:convert';
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
  final _controller = TextEditingController();
  bool _handling = false;
  String? _error;

  void _submit() async {
    final raw = _controller.text.trim();
    if (raw.isEmpty) {
      setState(() => _error = '请粘贴二维码内容');
      return;
    }

    Map<String, dynamic> data;
    try {
      data = jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      setState(() => _error = '格式无效，需要 JSON');
      return;
    }

    final server = data['server']?.toString();
    final qrToken = data['qrToken']?.toString();
    if (server == null || qrToken == null) {
      setState(() => _error = '缺少 server 或 qrToken 字段');
      return;
    }

    setState(() {
      _handling = true;
      _error = null;
    });

    try {
      final base = ApiClient.normalizeUrl(server);
      final result = await ApiClient.qrLogin(base, qrToken);
      await SecureStorage.saveSession(
        serverUrl: base,
        token: result['token'],
        username: result['username'] ?? '',
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
        child: ListView(
          children: [
            const Text(
              '在电脑端设置页生成二维码后，长按二维码复制文本，粘贴到下方框内即可自动登录。',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _controller,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: '在此粘贴二维码内容（JSON）',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _handling ? null : _submit,
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
