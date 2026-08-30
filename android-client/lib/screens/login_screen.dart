import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_client.dart';
import '../services/secure_storage.dart';
import 'notes_screen.dart';
import 'scan_login_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _serverController = TextEditingController(text: 'http://192.168.0.0:17918');
  final _userController = TextEditingController();
  final _passController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _serverController.dispose();
    _userController.dispose();
    _passController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final base = ApiClient.normalizeUrl(_serverController.text);
      final result = await ApiClient.login(
        base,
        _userController.text.trim(),
        _passController.text,
      );
      await SecureStorage.saveSession(
        serverUrl: base,
        token: result['token'],
        username: result['username'] ?? '',
        deviceId: result['deviceId'],
        role: result['role'],
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const NotesScreen()),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = '网络错误：$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('连接电脑端')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              const Text(
                '请输入电脑端（Phronesis Lite）在内网的服务地址与账号。\n同一账号即可读取电脑端的笔记与全部对话。',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _serverController,
                decoration: const InputDecoration(
                  labelText: '电脑端地址',
                  hintText: 'http://192.168.x.x:17918',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.isEmpty) ? '必填' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _userController,
                decoration: const InputDecoration(labelText: '账号', border: OutlineInputBorder()),
                validator: (v) => (v == null || v.isEmpty) ? '必填' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passController,
                decoration: const InputDecoration(labelText: '密码', border: OutlineInputBorder()),
                obscureText: true,
                validator: (v) => (v == null || v.isEmpty) ? '必填' : null,
              ),
              const SizedBox(height: 16),
              if (_error != null)
                Text(_error!, style: const TextStyle(color: Colors.red)),
              ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('登录'),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _loading
                    ? null
                    : () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const ScanLoginScreen()),
                        ),
                icon: const Icon(Icons.qr_code_scanner, size: 20),
                label: const Text('扫码登录'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
