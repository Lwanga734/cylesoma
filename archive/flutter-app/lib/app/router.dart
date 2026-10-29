import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/auth_repository.dart';
import '../features/admin/admin_home.dart';
import '../features/admin/invite_user_page.dart';
import '../features/admin/school_settings_page.dart';
import '../features/auth/login_page.dart';
import '../features/auth/set_password_page.dart';
import '../features/home/role_home.dart';
import '../features/profile/profile_page.dart';

/// Which route tree each role lands in. Staff roles share /admin for now.
String homeForRole(String? role) {
  switch (role) {
    case null:
      return '/no-access';
    case 'parent':
      return '/parent';
    case 'student':
      return '/student';
    case 'teacher':
      return '/teacher';
    default:
      return '/admin';
  }
}

/// Pages any signed-in user may open regardless of role.
const _sharedPaths = {'/profile', '/set-password'};

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(sessionInfoProvider, (_, __) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: refresh,
    redirect: (context, state) {
      final session = ref.read(sessionInfoProvider);
      final loc = state.matchedLocation;
      if (session == null) return loc == '/login' ? null : '/login';
      if (_sharedPaths.contains(loc)) return null;
      final home = homeForRole(session.role);
      if (loc == '/login' || loc == '/') return home;
      if (!loc.startsWith(home)) return home; // role guard (UI only; RLS is the real guard)
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SizedBox.shrink()),
      GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
      GoRoute(path: '/set-password', builder: (_, __) => const SetPasswordPage()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfilePage()),
      GoRoute(path: '/no-access', builder: (_, __) => const NoAccessPage()),
      GoRoute(
        path: '/admin',
        builder: (_, __) => const AdminHome(),
        routes: [
          GoRoute(path: 'school', builder: (_, __) => const SchoolSettingsPage()),
          GoRoute(path: 'invite', builder: (_, __) => const InviteUserPage()),
        ],
      ),
      GoRoute(path: '/teacher', builder: (_, __) => const RoleHome(title: 'Teacher')),
      GoRoute(path: '/parent', builder: (_, __) => const RoleHome(title: 'Parent')),
      GoRoute(path: '/student', builder: (_, __) => const RoleHome(title: 'Student')),
    ],
  );
});
