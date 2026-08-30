import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_client.dart';
import '../services/secure_storage.dart';
import 'kb_file_screen.dart';

class KbScreen extends StatefulWidget {
  final String? initialPath;
  const KbScreen({super.key, this.initialPath});

  @override
  State<KbScreen> createState() => _KbScreenState();
}

class _KbScreenState extends State<KbScreen> {
  final _storage = const FlutterSecureStorage();
  ApiClient? _api;
  List<dynamic> _entries = [];
  List<dynamic> _categories = [];
  String? _error;
  bool _loading = true;

  bool get _isRoot => widget.initialPath == null;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final server = await _storage.read(key: kServerUrlKey);
    final token = await _storage.read(key: kTokenKey);
    if (server == null || token == null) return;
    _api = ApiClient(serverUrl: server, token: token);
    await _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      if (_isRoot) {
        final tree = await _api!.getKbTree();
        if (!mounted) return;
        setState(() {
          _categories = tree['categories'] as List<dynamic>? ?? [];
          _loading = false;
        });
      } else {
        final entries = await _api!.getKbDir(widget.initialPath!);
        if (!mounted) return;
        setState(() {
          _entries = entries;
          _loading = false;
        });
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = '加载失败：$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openEntry(Map<String, dynamic> e) {
    final name = e['name']?.toString() ?? '';
    final isDir = e['isDirectory'] == true;
    final rel = e['path']?.toString() ?? '';
    if (isDir) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => KbScreen(initialPath: rel.isEmpty ? name : rel),
        ),
      );
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => KbFileScreen(api: _api!, relPath: rel, name: name),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isRoot ? '知识库（只读）' : (widget.initialPath ?? '知识库')),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load, tooltip: '刷新'),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : _isRoot
                  ? _buildCategories()
                  : _buildEntries(),
    );
  }

  Widget _buildCategories() {
    if (_categories.isEmpty) {
      return const Center(child: Text('暂无知识库'));
    }
    return ListView.separated(
      itemCount: _categories.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, i) {
        final cat = _categories[i];
        final items = (cat['items'] as List<dynamic>? ?? []);
        final catId = cat['id']?.toString() ?? '';
        return ExpansionTile(
          title: Text(cat['name']?.toString() ?? '分类'),
          children: items.isEmpty
              ? const [ListTile(title: Text('（空）', style: TextStyle(color: Colors.grey)))]
              : items
                  .map((it) {
                    final name = it['name']?.toString() ?? '';
                    final rel = '$catId/$name';
                    return ListTile(
                      leading: const Icon(Icons.folder),
                      title: Text(name),
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => KbScreen(initialPath: rel)),
                      ),
                    );
                  })
                  .toList(),
        );
      },
    );
  }

  Widget _buildEntries() {
    if (_entries.isEmpty) {
      return const Center(child: Text('空文件夹'));
    }
    return ListView.separated(
      itemCount: _entries.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, i) {
        final e = _entries[i];
        final isDir = e['isDirectory'] == true;
        return ListTile(
          leading: Icon(isDir ? Icons.folder : Icons.insert_drive_file),
          title: Text(e['name']?.toString() ?? ''),
          trailing: isDir
              ? null
              : const Chip(
                  label: Text('只读', style: TextStyle(fontSize: 11)),
                  visualDensity: VisualDensity.compact,
                ),
          onTap: () => _openEntry(e),
        );
      },
    );
  }
}
