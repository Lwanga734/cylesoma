import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Who is signed in, and in which school/role (read from JWT claims set by the
/// `custom_access_token_hook` in Supabase). The server enforces access via RLS;
/// this is only used to choose which screens to show.
class SessionInfo {
  const SessionInfo({required this.userId, this.schoolId, this.role});
  final String userId;
  final String? schoolId;
  final String? role;
}

Map<String, dynamic> decodeJwtClaims(String token) {
  final parts = token.split('.');
  if (parts.length != 3) return {};
  final payload = utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
  return jsonDecode(payload) as Map<String, dynamic>;
}

final supabaseProvider = Provider<SupabaseClient>((_) => Supabase.instance.client);

final authStateProvider = StreamProvider<AuthState>(
  (ref) => ref.watch(supabaseProvider).auth.onAuthStateChange,
);

final sessionInfoProvider = Provider<SessionInfo?>((ref) {
  ref.watch(authStateProvider); // rebuild on sign-in/out and token refresh
  final session = ref.watch(supabaseProvider).auth.currentSession;
  if (session == null) return null;
  final claims = decodeJwtClaims(session.accessToken);
  return SessionInfo(
    userId: session.user.id,
    schoolId: claims['school_id'] as String?,
    role: claims['user_role'] as String?,
  );
});

class AuthRepository {
  AuthRepository(this._client);
  final SupabaseClient _client;

  Future<void> signIn(String email, String password) =>
      _client.auth.signInWithPassword(email: email, password: password);

  Future<void> signOut() => _client.auth.signOut();
}

final authRepositoryProvider =
    Provider<AuthRepository>((ref) => AuthRepository(ref.watch(supabaseProvider)));
