import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/secure_storage.dart';
import '../services/wol_storage.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  List<WoLComputer> _computers = [];
  bool _loading = true;
  bool _synced = false; // whether loaded from server

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    // Try server first
    try {
      final serverUrl = await SecureStorage.read(kServerUrlKey);
      final token = await SecureStorage.read(kTokenKey);
      if (serverUrl != null && token != null && token.isNotEmpty) {
        final client = ApiClient(serverUrl: serverUrl, token: token);
        final list = await client.getWoLComputers();
        final computers = list.map((e) => WoLComputer.fromJson(e as Map<String, dynamic>)).toList();
        if (!mounted) return;
        setState(() {
          _computers = computers;
          _loading = false;
          _synced = true;
        });
        // Sync to local as backup
        await WoLStorage.saveComputers(computers);
        return;
      }
    } catch (_) {}
    // Fallback to local
    final list = await WoLStorage.loadComputers();
    if (!mounted) return;
    setState(() {
      _computers = list;
      _loading = false;
      _synced = false;
    });
  }

  Future<void> _saveToServer() async {
    if (!_synced) return;
    try {
      final serverUrl = await SecureStorage.read(kServerUrlKey);
      final token = await SecureStorage.read(kTokenKey);
      if (serverUrl != null && token != null) {
        final client = ApiClient(serverUrl: serverUrl, token: token);
        await client.saveWoLComputers(_computers.map((c) => c.toJson()).toList());
      }
    } catch (_) {}
    // Also save locally
    await WoLStorage.saveComputers(_computers);
  }

  Future<void> _addOrEdit({WoLComputer? existing}) async {
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final macCtrl = TextEditingController(text: existing?.macAddress ?? '');
    final ipCtrl = TextEditingController(text: existing?.broadcastIp ?? '255.255.255.255');
    final formKey = GlobalKey<FormState>();

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? '添加电脑' : '编辑电脑'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                  labelText: '电脑名称',
                  hintText: '例如：办公室电脑',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? '必填' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: macCtrl,
                decoration: const InputDecoration(
                  labelText: 'MAC 地址',
                  hintText: 'AA:BB:CC:DD:EE:FF',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return '必填';
                  if (!RegExp(r'^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$').hasMatch(v.trim())) {
                    return '格式：AA:BB:CC:DD:EE:FF';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: ipCtrl,
                decoration: const InputDecoration(
                  labelText: '广播地址',
                  hintText: '255.255.255.255',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? '必填' : null,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          FilledButton(
            onPressed: () {
              if (formKey.currentState!.validate()) {
                Navigator.pop(ctx, true);
              }
            },
            child: const Text('保存'),
          ),
        ],
      ),
    );

    if (result != true) return;

    final computer = WoLComputer(
      name: nameCtrl.text.trim(),
      macAddress: macCtrl.text.trim().toUpperCase(),
      broadcastIp: ipCtrl.text.trim(),
      id: existing?.id,
    );

    if (existing != null) {
      final idx = _computers.indexWhere((c) => c.id == existing.id);
      if (idx >= 0) _computers[idx] = computer;
    } else {
      _computers.add(computer);
    }
    await _saveToServer();
    if (!mounted) return;
    setState(() {});
  }

  Future<void> _delete(WoLComputer c) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('确认删除'),
        content: Text('确定要删除「${c.name}」吗？'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    if (confirm == true) {
      _computers.removeWhere((e) => e.id == c.id);
      await _saveToServer();
      if (!mounted) return;
      setState(() {});
    }
  }

  Future<void> _wake(WoLComputer c) async {
    // Try server-side wake first (works even if phone can't reach target LAN)
    try {
      final serverUrl = await SecureStorage.read(kServerUrlKey);
      final token = await SecureStorage.read(kTokenKey);
      if (serverUrl != null && token != null && token.isNotEmpty) {
        final client = ApiClient(serverUrl: serverUrl, token: token);
        await client.wakeComputer(c.macAddress, broadcast: c.broadcastIp);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('已发送开机指令到「${c.name}」')),
        );
        return;
      }
    } catch (_) {}

    // Fallback: direct UDP from phone
    try {
      final macBytes = c.macAddress
          .split(':')
          .map((s) => int.parse(s, radix: 16))
          .toList();
      if (macBytes.length != 6) throw const FormatException('Invalid MAC');

      final magic = Uint8List(6 + 16 * 6);
      for (int i = 0; i < 6; i++) magic[i] = 0xFF;
      for (int i = 0; i < 16; i++) {
        for (int j = 0; j < 6; j++) {
          magic[6 + i * 6 + j] = macBytes[j];
        }
      }

      final addr = InternetAddress(c.broadcastIp);
      final socket = await RawDatagramSocket.bind(
        InternetAddress.anyIPv4,
        0,
        reuseAddress: true,
      );
      socket.broadcastEnabled = true;
      socket.send(magic, addr, 9);
      socket.close();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('已发送开机指令到「${c.name}」')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('发送失败：$e'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('设置'),
            if (_synced)
              const Padding(
                padding: EdgeInsets.only(left: 8),
                child: Icon(Icons.cloud_done, size: 16, color: Colors.green),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _addOrEdit(),
            tooltip: '添加电脑',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _computers.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.computer, size: 64, color: Colors.grey.shade400),
                      const SizedBox(height: 16),
                      Text('暂无已保存的电脑', style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
                      const SizedBox(height: 8),
                      Text(
                        _synced ? '点击右上角 + 添加需要远程开机的电脑' : '未连接电脑端，使用本地存储',
                        style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: _computers.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, i) {
                    final c = _computers[i];
                    return ListTile(
                      leading: CircleAvatar(
                        child: Text(c.name.isNotEmpty ? c.name[0].toUpperCase() : '?'),
                      ),
                      title: Text(c.name),
                      subtitle: Text('${c.macAddress}\n广播: ${c.broadcastIp}'),
                      isThreeLine: true,
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.power_settings_new, color: Colors.green),
                            tooltip: '开机',
                            onPressed: () => _wake(c),
                          ),
                          PopupMenuButton<String>(
                            onSelected: (v) {
                              if (v == 'edit') _addOrEdit(existing: c);
                              if (v == 'delete') _delete(c);
                            },
                            itemBuilder: (_) => [
                              const PopupMenuItem(value: 'edit', child: Text('编辑')),
                              const PopupMenuItem(value: 'delete', child: Text('删除')),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
