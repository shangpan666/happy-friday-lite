import 'package:flutter/material.dart';
import '../services/api_client.dart';

class CreateAccountScreen extends StatefulWidget {
  final ApiClient api;
  const CreateAccountScreen({super.key, required this.api});

  @override
  State<CreateAccountScreen> createState() => _CreateAccountScreenState();
}

class _CreateAccountScreenState extends State<CreateAccountScreen> {
  final _formKey = GlobalKey<FormState>();
  final _userController = TextEditingController();
  final _passController = TextEditingController();
  String _role = 'user';
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
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
      await widget.api.register(
        _userController.text.trim(),
        _passController.text,
        _role,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('账号已创建')),
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
      appBar: AppBar(title: const Text('创建账号')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              const Text(
                '为员工创建子账号。员工登录后可查看你的笔记（只读），但不能修改。',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _userController,
                decoration: const InputDecoration(
                  labelText: '用户名',
                  hintText: '员工账号名',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? '必填' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passController,
                decoration: const InputDecoration(labelText: '密码', border: OutlineInputBorder()),
                obscureText: true,
                validator: (v) => (v == null || v.isEmpty) ? '必填' : null,
              ),
              const SizedBox(height: 16),
              const Text('角色', style: TextStyle(fontSize: 13, color: Colors.grey)),
              RadioListTile<String>(
                title: const Text('管理员'),
                value: 'admin',
                groupValue: _role,
                onChanged: (v) => setState(() => _role = v!),
              ),
              RadioListTile<String>(
                title: const Text('员工（只读查看管理员笔记）'),
                value: 'user',
                groupValue: _role,
                onChanged: (v) => setState(() => _role = v!),
              ),
              const SizedBox(height: 8),
              if (_error != null)
                Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('创建账号'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
