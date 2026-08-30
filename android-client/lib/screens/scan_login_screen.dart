import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:qr_code_scanner/qr_code_scanner.dart';
import '../services/api_client.dart';
import '../services/secure_storage.dart';
import 'notes_screen.dart';

class ScanLoginScreen extends StatefulWidget {
  const ScanLoginScreen({super.key});

  @override
  State<ScanLoginScreen> createState() => _ScanLoginScreenState();
}

class _ScanLoginScreenState extends State<ScanLoginScreen> {
  final GlobalKey qrKey = GlobalKey(debugLabel: 'QR');
  QRViewController? _controller;
  bool _handling = false;
  String? _error;

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  void _onQRViewCreated(QRViewController controller) {
    _controller = controller;
    controller.scannedDataStream.listen((scanData) async {
      if (_handling || scanData.code == null) return;
      final raw = scanData.code!;

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

      await _controller?.pauseCamera();
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
        await _controller?.resumeCamera();
      } catch (e) {
        if (!mounted) return;
        setState(() {
          _error = '网络错误：$e';
          _handling = false;
        });
        await _controller?.resumeCamera();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('扫码登录')),
      body: Stack(
        fit: StackFit.expand,
        children: [
          QRView(
            key: qrKey,
            onQRViewCreated: _onQRViewCreated,
            overlay: QrScannerOverlayShape(
              borderColor: Colors.white70,
              borderRadius: 12,
              borderLength: 30,
              borderWidth: 2,
              cutOutSize: 250,
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
