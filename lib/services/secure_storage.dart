import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const String kServerUrlKey = 'hf_server_url';
const String kTokenKey = 'hf_token';
const String kUsernameKey = 'hf_username';
const String kDeviceIdKey = 'hf_device_id';
const String kRoleKey = 'hf_role';

class SecureStorage {
  static const _storage = FlutterSecureStorage();

  static Future<void> saveSession({
    required String serverUrl,
    required String token,
    required String username,
    String? deviceId,
    String? role,
  }) async {
    await _storage.write(key: kServerUrlKey, value: serverUrl);
    await _storage.write(key: kTokenKey, value: token);
    await _storage.write(key: kUsernameKey, value: username);
    if (deviceId != null) {
      await _storage.write(key: kDeviceIdKey, value: deviceId);
    }
    if (role != null) {
      await _storage.write(key: kRoleKey, value: role);
    }
  }

  static Future<void> clearSession() async {
    await _storage.delete(key: kTokenKey);
    await _storage.delete(key: kUsernameKey);
    await _storage.delete(key: kDeviceIdKey);
    await _storage.delete(key: kRoleKey);
  }

  static Future<String?> read(String key) => _storage.read(key: key);
}
