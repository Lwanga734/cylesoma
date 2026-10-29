import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/auth/auth_repository.dart';
import '../../core/util/format.dart';

/// UI mirror of the server rule in supabase/functions/invite-user/roles.ts.
/// The Edge Function is the real enforcement; this only decides what to show.
const _allSchoolRoles = [
  'owner', 'deputy', 'hod', 'bursar', 'registrar', 'hr', 'teacher',
  'librarian', 'nurse', 'storekeeper', 'boarding', 'transport', 'parent', 'student',
];

List<String> invitableRoles(String? callerRole) {
  switch (callerRole) {
    case 'head':
      return ['head', ..._allSchoolRoles];
    case 'registrar':
      return ['parent', 'student'];
    case 'hr':
      return ['teacher', 'librarian', 'nurse', 'storekeeper', 'boarding', 'transport'];
    default:
      return [];
  }
}

class InviteUserPage extends ConsumerStatefulWidget {
  const InviteUserPage({super.key});
  @override
  ConsumerState<InviteUserPage> createState() => _InviteUserPageState();
}

class _InviteUserPageState extends ConsumerState<InviteUserPage> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  String? _role;
  bool _busy = false;

  Future<void> _invite() async {
    final name = _name.text.trim();
    final email = _email.text.trim();
    if (name.isEmpty || email.isEmpty || _role == null) {
      _toast('Enter a name, an email and choose a role.');
      return;
    }
    setState(() => _busy = true);
    try {
      final res = await ref
          .read(supabaseProvider)
          .functions
          .invoke('invite-user', body: {'email': email, 'full_name': name, 'role': _role});
      final data = res.data;
      final invited = data is Map && data['invited'] == true;
      _toast(invited ? 'Invitation sent to $email.' : '$email already has an account and was added.');
      _name.clear();
      _email.clear();
    } on FunctionException catch (e) {
      final d = e.details;
      _toast(d is Map && d['error'] is String ? d['error'] as String : 'Invitation failed.');
    } catch (_) {
      _toast('Invitation failed. Check your connection.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _toast(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final roles = invitableRoles(ref.watch(sessionInfoProvider)?.role);
    return Scaffold(
      appBar: AppBar(title: const Text('Invite a user')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: ListView(padding: const EdgeInsets.all(24), shrinkWrap: true, children: [
            TextField(controller: _name, decoration: const InputDecoration(labelText: 'Full name')),
            const SizedBox(height: 12),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _role,
              decoration: const InputDecoration(labelText: 'Role'),
              items: [for (final r in roles) DropdownMenuItem(value: r, child: Text(roleLabel(r)))],
              onChanged: (v) => setState(() => _role = v),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _busy || roles.isEmpty ? null : _invite,
              child: _busy
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Send invitation'),
            ),
          ]),
        ),
      ),
    );
  }
}
