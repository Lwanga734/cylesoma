import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_repository.dart';
import '../../core/data/school_repository.dart';
import '../../core/theme/app_theme.dart';
import '../../core/util/format.dart';

class SchoolSettingsPage extends ConsumerWidget {
  const SchoolSettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final school = ref.watch(schoolProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('School settings')),
      body: school.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Could not load school: $e')),
        data: (s) => s == null
            ? const Center(child: Text('No school selected'))
            : ListView(padding: const EdgeInsets.all(16), children: [
                _SchoolForm(school: s),
                const SizedBox(height: 32),
                const _TermsSection(),
              ]),
      ),
    );
  }
}

class _SchoolForm extends ConsumerStatefulWidget {
  const _SchoolForm({required this.school});
  final School school;
  @override
  ConsumerState<_SchoolForm> createState() => _SchoolFormState();
}

class _SchoolFormState extends ConsumerState<_SchoolForm> {
  late final _name = TextEditingController(text: widget.school.name);
  late final _motto = TextEditingController(text: widget.school.motto ?? '');
  late final _color = TextEditingController(text: widget.school.primaryColor);
  bool _busy = false;

  Future<void> _save() async {
    final color = _color.text.trim();
    if (_name.text.trim().isEmpty) return _toast('School name is required.');
    if (!RegExp(r'^#[0-9a-fA-F]{6}$').hasMatch(color)) return _toast('Colour must look like #053065.');
    setState(() => _busy = true);
    try {
      await ref.read(schoolRepositoryProvider).updateSchool(
            widget.school.id,
            name: _name.text.trim(),
            motto: _motto.text.trim().isEmpty ? null : _motto.text.trim(),
            primaryColor: color,
          );
      ref.invalidate(schoolProvider);
      _toast('Saved.');
    } catch (e) {
      _toast('$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _toast(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
  }

  @override
  void dispose() {
    _name.dispose();
    _motto.dispose();
    _color.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('School details', style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 12),
      TextField(controller: _name, decoration: const InputDecoration(labelText: 'School name')),
      const SizedBox(height: 12),
      TextField(controller: _motto, decoration: const InputDecoration(labelText: 'Motto')),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(
          child: TextField(
            controller: _color,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(labelText: 'Brand colour (hex)'),
          ),
        ),
        const SizedBox(width: 12),
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: parseHexColor(_color.text),
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ]),
      const SizedBox(height: 16),
      FilledButton(onPressed: _busy ? null : _save, child: const Text('Save')),
    ]);
  }
}

class _TermsSection extends ConsumerWidget {
  const _TermsSection();

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    final result = await showDialog<_NewTerm>(context: context, builder: (_) => const _AddTermDialog());
    final schoolId = ref.read(sessionInfoProvider)?.schoolId;
    if (result == null || schoolId == null) return;
    try {
      await ref.read(schoolRepositoryProvider).addTerm(
            schoolId: schoolId,
            name: result.name,
            year: result.year,
            startsOn: result.startsOn,
            endsOn: result.endsOn,
          );
      ref.invalidate(termsProvider);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Could not add the term (duplicate or no permission).')));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final terms = ref.watch(termsProvider);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Expanded(child: Text('Terms', style: Theme.of(context).textTheme.titleMedium)),
        TextButton.icon(
          onPressed: () => _add(context, ref),
          icon: const Icon(Icons.add),
          label: const Text('Add term'),
        ),
      ]),
      terms.when(
        loading: () => const LinearProgressIndicator(),
        error: (e, _) => Text('Could not load terms: $e'),
        data: (list) => list.isEmpty
            ? const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('No terms yet.'))
            : Column(children: [
                for (final t in list)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${t.name} ${t.year}'),
                    subtitle: Text('${formatDate(t.startsOn)} to ${formatDate(t.endsOn)}'),
                    trailing: t.isCurrent
                        ? const Chip(label: Text('Current'))
                        : TextButton(
                            onPressed: () async {
                              await ref.read(schoolRepositoryProvider).setCurrentTerm(t.id);
                              ref.invalidate(termsProvider);
                            },
                            child: const Text('Set current'),
                          ),
                  ),
              ]),
      ),
    ]);
  }
}

class _NewTerm {
  const _NewTerm(this.name, this.year, this.startsOn, this.endsOn);
  final String name;
  final int year;
  final DateTime startsOn;
  final DateTime endsOn;
}

class _AddTermDialog extends StatefulWidget {
  const _AddTermDialog();
  @override
  State<_AddTermDialog> createState() => _AddTermDialogState();
}

class _AddTermDialogState extends State<_AddTermDialog> {
  final _name = TextEditingController(text: 'Term 1');
  final _year = TextEditingController(text: DateTime.now().year.toString());
  DateTime? _start;
  DateTime? _end;

  Future<DateTime?> _pick(DateTime? initial) => showDatePicker(
        context: context,
        initialDate: initial ?? DateTime.now(),
        firstDate: DateTime(2020),
        lastDate: DateTime(2100),
      );

  @override
  void dispose() {
    _name.dispose();
    _year.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final year = int.tryParse(_year.text);
    final valid = _name.text.trim().isNotEmpty &&
        year != null &&
        _start != null &&
        _end != null &&
        _end!.isAfter(_start!);
    return AlertDialog(
      title: const Text('Add term'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(
          controller: _name,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(labelText: 'Name'),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _year,
          keyboardType: TextInputType.number,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(labelText: 'Year'),
        ),
        const SizedBox(height: 8),
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(_start == null ? 'Start date' : 'Starts ${formatDate(_start!)}'),
          trailing: const Icon(Icons.calendar_today),
          onTap: () async {
            final d = await _pick(_start);
            if (d != null) setState(() => _start = d);
          },
        ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(_end == null ? 'End date' : 'Ends ${formatDate(_end!)}'),
          trailing: const Icon(Icons.calendar_today),
          onTap: () async {
            final d = await _pick(_end ?? _start);
            if (d != null) setState(() => _end = d);
          },
        ),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(
          onPressed: valid
              ? () => Navigator.pop(context, _NewTerm(_name.text.trim(), year, _start!, _end!))
              : null,
          child: const Text('Add'),
        ),
      ],
    );
  }
}
