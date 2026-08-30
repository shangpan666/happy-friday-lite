import 'dart:convert';
import 'package:http/http.dart' as http;
import 'secure_storage.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class ApiClient {
  final String serverUrl;
  final String token;

  ApiClient({required this.serverUrl, required this.token});

  // 规范化服务地址，确保为 http(s)://host:port 形式
  static String normalizeUrl(String url) {
    var u = url.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'http://$u';
    }
    while (u.endsWith('/')) {
      u = u.substring(0, u.length - 1);
    }
    return u;
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': 'Bearer $token',
      };

  // 登录：返回 { token, username, role, deviceId, deviceName }
  static Future<Map<String, dynamic>> login(String serverUrl, String username, String password) async {
    final base = normalizeUrl(serverUrl);
    final resp = await http.post(
      Uri.parse('$base/api/auth/login'),
      headers: {'Content-Type': 'application/json; charset=utf-8'},
      body: jsonEncode({'username': username, 'password': password}),
    );
    final body = _decode(resp);
    if (resp.statusCode == 200 && body['success'] == true) {
      return body;
    }
    throw ApiException(body['error']?.toString() ?? '登录失败');
  }

  static Map<String, dynamic> _decode(http.Response resp) {
    try {
      return jsonDecode(utf8.decode(resp.bodyBytes));
    } catch (_) {
      return {};
    }
  }

  Future<Map<String, dynamic>> _get(String path) async {
    final resp = await http.get(Uri.parse('$serverUrl$path'), headers: _headers);
    final body = _decode(resp);
    if (resp.statusCode == 401) {
      throw ApiException('登录已失效，请重新登录');
    }
    if (resp.statusCode == 200 && body['success'] == true) {
      return body;
    }
    throw ApiException(body['error']?.toString() ?? '请求失败');
  }

  // 笔记列表
  Future<List<dynamic>> getNotes() async {
    final body = await _get('/api/mobile/notes');
    return body['notes'] as List<dynamic>? ?? [];
  }

  // 单条笔记详情
  Future<Map<String, dynamic>> getNote(String id) async {
    final body = await _get('/api/mobile/note/$id');
    return body['note'] as Map<String, dynamic>? ?? {};
  }

  // 搜索笔记
  Future<List<dynamic>> searchNotes(String q) async {
    final body = await _get('/api/mobile/notes/search?q=${Uri.encodeComponent(q)}');
    return body['notes'] as List<dynamic>? ?? [];
  }

  // 会话列表
  Future<List<dynamic>> getSessions() async {
    final body = await _get('/api/mobile/sessions');
    return body['sessions'] as List<dynamic>? ?? [];
  }

  // 单条会话详情（含消息）
  Future<Map<String, dynamic>> getSession(String id) async {
    final body = await _get('/api/mobile/session/$id');
    return body;
  }

  // 发起对话：把消息交给电脑端 Friday 智能体
  Future<Map<String, dynamic>> sendChat(String message, {String? sessionId}) async {
    final resp = await http.post(
      Uri.parse('$serverUrl/api/mobile/chat'),
      headers: _headers,
      body: jsonEncode({'message': message, 'sessionId': sessionId}),
    );
    final body = _decode(resp);
    if (resp.statusCode == 401) {
      throw ApiException('登录已失效，请重新登录');
    }
    if (resp.statusCode == 200 && body['success'] == true) {
      return body;
    }
    throw ApiException(body['error']?.toString() ?? '对话失败');
  }

  // 创建子账号（仅管理员可用）
  Future<Map<String, dynamic>> register(String username, String password, String role) async {
    final resp = await http.post(
      Uri.parse('$serverUrl/api/auth/register'),
      headers: _headers,
      body: jsonEncode({'username': username, 'password': password, 'role': role}),
    );
    final body = _decode(resp);
    if (resp.statusCode == 200 && body['success'] == true) {
      return body;
    }
    throw ApiException(body['error']?.toString() ?? '创建失败');
  }

  // ===== 知识库（只读共享）=====
  // 知识库目录树（分类 -> 知识库列表）
  Future<Map<String, dynamic>> getKbTree() async {
    final body = await _get('/api/mobile/kb/tree');
    return body;
  }

  // 列出某目录（relPath 为相对 knowledge 根的路径）
  Future<List<dynamic>> getKbDir(String relPath) async {
    final p = Uri.encodeComponent(relPath);
    final body = await _get('/api/mobile/kb/read-dir?p=$p');
    return body['entries'] as List<dynamic>? ?? [];
  }

  // 读取文件内容（relPath 为相对 knowledge 根的路径）
  Future<Map<String, dynamic>> getKbFile(String relPath) async {
    final p = Uri.encodeComponent(relPath);
    final body = await _get('/api/mobile/kb/file?p=$p');
    return body;
  }
}
