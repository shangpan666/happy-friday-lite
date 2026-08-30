import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/api_client.dart';
import '../services/secure_storage.dart';
import 'notes_screen.dart';

class ScanLoginScreen extends StatefulWidget {
  const ScanLoginScreen({super.key});

  @override
  State<ScanLoginScreen> createState() => _ScanLoginScreenState();
}

class _ScanLoginScreenState extends State<ScanLoginScreen> {
  MobileScannerController? _controller;
  bool _handling = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
    );
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_handling) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode == null || barcode.rawValue == null) return;

    final raw = barcode.rawValue!;
    Map<String, dynamic> data;
    try {
      data = jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = '二维码格式无效');
      return;
    }

    final server = data['server']?.toString();
    final user = data['user']?.toString();
    final pass = data['pass']?.toString();
    if (server == null || user == null || pass == null) {
      if (!mounted) return;
      setState(() => _error = '二维码缺少登录信息');
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
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(
            controller: _controller!,
            onDetect: _onDetect,
          ),
          // Center scan window overlay
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white70, width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          // Top hint
          Positioned(
            top: 40,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  '将电脑端二维码放入框内',
                  style: TextStyle(color: Colors.white, fontSize: 14),
                ),
              ),
            ),
          ),
          // Bottom status
          Positioned(
            bottom: 60,
            left: 0,
            right: 0,
            child: Center(
              child: _handling
                  ? Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          ),
                          SizedBox(width: 10),
                          Text('正在登录...', style: TextStyle(color: Colors.white)),
                        ],
                      ),
                    )
                  : _error != null
                      ? Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.red.shade900,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(_error!, style: const TextStyle(color: Colors.white, fontSize: 13)),
                        )
                      : null,
            ),
          ),
        ],
      ),
    );
  }
}
