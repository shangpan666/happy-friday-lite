import 'package:flutter/material.dart';
import '../services/api_client.dart';

class KbFileScreen extends StatefulWidget {
  final ApiClient api;
  final String relPath;
  final String name;
  const KbFileScreen({
    super.key,
    required this.api,
    required this.relPath,
    required this.name,
  });

  @override
  State<KbFileScreen> createState() => _KbFileScreenState();
}

class _KbFileScreenState extends State<KbFileScreen> {
  String? _content;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final body = await widget.api.getKbFile(widget.relPath);
      if (!mounted) return;
      if (body['success'] == true) {
        setState(() {
          _content = body['content']?.toString() ?? '';
          _loading = false;
        });
      } else {
        setState(() {
          _error = body['error']?.toString() ?? '读取失败';
          _loading = false;
        });
      }
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = '读取失败：$e';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.name),
        actions: const [
          Chip(
            label: Text('只读', style: TextStyle(fontSize: 11)),
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: SelectableText(
                    _content ?? '',
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
                  ),
                ),
    );
  }
}
