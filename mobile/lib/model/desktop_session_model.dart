import 'package:equatable/equatable.dart';

class DesktopSession with EquatableMixin {
  final String id;
  final String name;
  final int lastActive;
  final String? type;

  const DesktopSession({
    required this.id,
    required this.name,
    required this.lastActive,
    this.type,
  });

  @override
  List<Object?> get props => [id, name, lastActive, type];
}
