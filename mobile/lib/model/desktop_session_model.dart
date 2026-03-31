import 'package:equatable/equatable.dart';

class DesktopSession with EquatableMixin {
  final String id;
  final String name;
  final int lastActive;

  const DesktopSession({
    required this.id,
    required this.name,
    required this.lastActive,
  });

  @override
  List<Object?> get props => [id, name, lastActive];
}
