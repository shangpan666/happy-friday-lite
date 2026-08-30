import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_client.dart';
import '../services/secure_storage.dart';
import 'note_detail_screen.dart';
import 'session_detail_screen.dart';
import 'login_screen.dart';
import 'create_account_screen.dart';
import 'kb_screen.dart';
import 'settings_screen.dart';

class NotesScreen extends StatefulWidget {
  const NotesScreen({super.key});

  @override
  State<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends State<NotesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _storage = const FlutterSecureStorage();
  ApiClient? _api;

  List<dynamic> _notes = [];
  List<dynamic> _sessions = [];
  bool _loading = true;
  bool _isAdmin = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _initClient();
  }

  Future<void> _initClient() async {
    final server = await _storage.read(key: kServerUrlKey);
    final token = await _storage.read(key: kTokenKey);
    final user = await _storage.read(key: kUsernameKey);
    final role = await _storage.read(key: kRoleKey);
    if (server == null || token == null) {
      _logout();
      return;
    }
    _isAdmin = role == 'admin';
    _api = ApiClient(serverUrl: server, token: token);
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() => _loading = true);
    try {
      final notes = await _api!.getNotes();
      final sessions = await _api!.getSessions();
      if (!mounted) return;
      setState(() {
        _notes = notes;
        _sessions = sessions;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (e.message.contains('重新登录')) {
        _logout();
        return;
      }
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = '加载失败：$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    await SecureStorage.clearSession();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  Future<void> _openCreateAccount() async {
    if (_api == null) return;
    await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => CreateAccountScreen(api: _api!)),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Phronesis 安卓端'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [Tab(text: '笔记'), Tab(text: '对话')],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const SettingsScreen()),
            ),
            tooltip: '设置',
          ),
          IconButton(
            icon: const Icon(Icons.library_books),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const KbScreen()),
            ),
            tooltip: '知识库',
          ),
          if (_isAdmin)
            IconButton(
              icon: const Icon(Icons.person_add),
              onPressed: _openCreateAccount,
              tooltip: '创建账号',
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAll,
            tooltip: '刷新',
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _logout,
            tooltip: '退出登录',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildNotesList(),
                    _buildSessionsList(),
                  ],
                ),
    );
  }

  Widget _buildNotesList() {
    if (_notes.isEmpty) {
      return const Center(child: Text('暂无笔记'));
    }
    return ListView.separated(
      itemCount: _notes.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, i) {
        final n = _notes[i];
        final readOnly = n['readOnly'] == true;
        return ListTile(
          title: Text(n['title']?.toString() ?? '无标题'),
          subtitle: Text(
            (n['contentText']?.toString() ?? '').replaceAll('\n', ' ').isEmpty
                ? '无预览'
                : (n['contentText'] as String).replaceAll('\n', ' '),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          trailing: readOnly
              ? Chip(
                  label: const Text('只读', style: TextStyle(fontSize: 11)),
                  visualDensity: VisualDensity.compact,
                  backgroundColor: Colors.amber.shade100,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                )
              : null,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => NoteDetailScreen(api: _api!, noteId: n['id'])),
          ),
        );
      },
    );
  }

  Widget _buildSessionsList() {
    if (_sessions.isEmpty) {
      return const Center(child: Text('暂无对话'));
    }
    return ListView.separated(
      itemCount: _sessions.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, i) {
        final s = _sessions[i];
        return ListTile(
          title: Text(s['title']?.toString() ?? '未命名对话'),
          subtitle: Text(s['updatedAt']?.toString() ?? ''),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => SessionDetailScreen(api: _api!, sessionId: s['id'])),
          ),
        );
      },
    );
  }
}
