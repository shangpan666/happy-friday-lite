import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const String _kWoLKey = 'hf_wol_computers';

class WoLComputer {
  final String id;
  final String name;
  final String macAddress;
  final String broadcastIp;

  WoLComputer({
    required this.name,
    required this.macAddress,
    required this.broadcastIp,
    String? id,
  }) : id = id ?? DateTime.now().millisecondsSinceEpoch.toString();

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'macAddress': macAddress,
        'broadcastIp': broadcastIp,
      };

  factory WoLComputer.fromJson(Map<String, dynamic> json) => WoLComputer(
        id: json['id']?.toString(),
        name: json['name']?.toString() ?? '',
        macAddress: json['macAddress']?.toString() ?? '',
        broadcastIp: json['broadcastIp']?.toString() ?? '',
      );
}

class WoLStorage {
  static const _storage = FlutterSecureStorage();

  static Future<List<WoLComputer>> loadComputers() async {
    final raw = await _storage.read(key: _kWoLKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list.map((e) => WoLComputer.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> saveComputers(List<WoLComputer> computers) async {
    final raw = jsonEncode(computers.map((c) => c.toJson()).toList());
    await _storage.write(key: _kWoLKey, value: raw);
  }

  static Future<void> addComputer(WoLComputer computer) async {
    final list = await loadComputers();
    list.add(computer);
    await saveComputers(list);
  }

  static Future<void> removeComputer(String id) async {
    final list = await loadComputers();
    list.removeWhere((c) => c.id == id);
    await saveComputers(list);
  }

  static Future<void> updateComputer(WoLComputer computer) async {
    final list = await loadComputers();
    final idx = list.indexWhere((c) => c.id == computer.id);
    if (idx >= 0) {
      list[idx] = computer;
      await saveComputers(list);
    }
  }
}
