import 'package:flutter/material.dart';
import '../services/api_client.dart';

class NoteDetailScreen extends StatefulWidget {
  final ApiClient api;
  final String noteId;
  const NoteDetailScreen({super.key, required this.api, required this.noteId});

  @override
  State<NoteDetailScreen> createState() => _NoteDetailScreenState();
}

class _NoteDetailScreenState extends State<NoteDetailScreen> {
  Map<String, dynamic>? _note;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final note = await widget.api.getNote(widget.noteId);
      if (!mounted) return;
      setState(() {
        _note = note;
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = '加载失败：$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_note?['title']?.toString() ?? '笔记')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : Column(
                  children: [
                    if (_note?['readOnly'] == true)
                      Container(
                        width: double.infinity,
                        color: Colors.amber.shade50,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        child: const Text(
                          '该笔记来自管理员共享，仅可查看、不可修改。',
                          style: TextStyle(color: Colors.orange, fontSize: 13),
                        ),
                      ),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: SelectableText(
                          _note?['contentText']?.toString() ??
                              _note?['content']?.toString() ??
                              '（空笔记）',
                          style: const TextStyle(fontSize: 15, height: 1.5),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}
