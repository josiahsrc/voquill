import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';

part 'auth_user_model.draft.dart';

@draft
class AuthUser with EquatableMixin {
  final String uid;
  final String? email;

  const AuthUser({required this.uid, this.email});

  @override
  List<Object?> get props => [uid, email];
}
