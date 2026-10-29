import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_repository.dart';
import '../../core/data/school_repository.dart';
import '../../core/util/format.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final info = ref.watch(sessionInfoProvider);
    final school = ref.watch(schoolProvider).maybeWhen(data: (s) => s, orElse: () => null);
    final memberships = ref.watch(membershipsProvider);
    final email = ref.watch(supabaseProvider).auth.currentUser?.email ?? '';

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(children: [
        ListTile(leading: const Icon(Icons.email_outlined), title: Text(email)),
        ListTile(
          leading: const Icon(Icons.badge_outlined),
          title: Text(roleLabel(info?.role)),
          subtitle: Text(school?.name ?? 'No school selected'),
        ),
        const Divider(),
        memberships.when(
          loading: () => const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator()),
          error: (_, __) => const ListTile(title: Text('Could not load your schools')),
          data: (list) {
            if (list.length < 2) return const SizedBox.shrink();
            return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Text('Switch school', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              for (final m in list)
                ListTile(
                  title: Text(m.schoolName),
                  subtitle: Text(roleLabel(m.role)),
                  trailing: m.schoolId == info?.schoolId ? const Icon(Icons.check) : null,
                  onTap: m.schoolId == info?.schoolId
                      ? null
                      : () async {
                          await ref.read(schoolRepositoryProvider).switchSchool(m.schoolId);
                          ref.invalidate(schoolProvider);
                          ref.invalidate(termsProvider);
                          if (context.mounted) context.go('/');
                        },
                ),
              const Divider(),
            ]);
          },
        ),
        ListTile(
          leading: const Icon(Icons.lock_outline),
          title: const Text('Change password'),
          onTap: () => context.push('/set-password'),
        ),
        ListTile(
          leading: const Icon(Icons.logout),
          title: const Text('Sign out'),
          onTap: () => ref.read(authRepositoryProvider).signOut(),
        ),
      ]),
    );
  }
}
