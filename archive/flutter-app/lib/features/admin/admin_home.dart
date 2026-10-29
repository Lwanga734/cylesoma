import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_repository.dart';
import '../../core/data/school_repository.dart';
import '../../core/util/format.dart';
import 'invite_user_page.dart';

class AdminHome extends ConsumerWidget {
  const AdminHome({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(sessionInfoProvider)?.role;
    final school = ref.watch(schoolProvider).maybeWhen(data: (s) => s, orElse: () => null);
    return Scaffold(
      appBar: AppBar(
        title: Text(school?.name ?? 'Administration'),
        actions: [
          IconButton(
            tooltip: 'Profile',
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: ListView(children: [
        ListTile(title: Text('Signed in as ${roleLabel(role)}'), subtitle: Text(school?.motto ?? '')),
        const Divider(),
        if (role == 'head')
          ListTile(
            leading: const Icon(Icons.school_outlined),
            title: const Text('School settings'),
            subtitle: const Text('Name, colours, terms'),
            onTap: () => context.push('/admin/school'),
          ),
        if (invitableRoles(role).isNotEmpty)
          ListTile(
            leading: const Icon(Icons.person_add_alt_outlined),
            title: const Text('Invite users'),
            subtitle: const Text('Teachers, staff, parents, students'),
            onTap: () => context.push('/admin/invite'),
          ),
      ]),
    );
  }
}
