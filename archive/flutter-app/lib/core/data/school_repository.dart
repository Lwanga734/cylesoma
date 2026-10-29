import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../auth/auth_repository.dart';
import '../theme/app_theme.dart';
import '../util/format.dart';

class School {
  const School({
    required this.id,
    required this.name,
    required this.primaryColor,
    this.motto,
    this.logoPath,
  });
  final String id;
  final String name;
  final String primaryColor;
  final String? motto;
  final String? logoPath;

  factory School.fromMap(Map<String, dynamic> m) => School(
        id: m['id'] as String,
        name: m['name'] as String,
        primaryColor: (m['primary_color'] as String?) ?? '#053065',
        motto: m['motto'] as String?,
        logoPath: m['logo_path'] as String?,
      );
}

class Term {
  const Term({
    required this.id,
    required this.name,
    required this.year,
    required this.startsOn,
    required this.endsOn,
    required this.isCurrent,
  });
  final String id;
  final String name;
  final int year;
  final DateTime startsOn;
  final DateTime endsOn;
  final bool isCurrent;

  factory Term.fromMap(Map<String, dynamic> m) => Term(
        id: m['id'] as String,
        name: m['name'] as String,
        year: m['year'] as int,
        startsOn: DateTime.parse(m['starts_on'] as String),
        endsOn: DateTime.parse(m['ends_on'] as String),
        isCurrent: m['is_current'] as bool,
      );
}

class Membership {
  const Membership({required this.schoolId, required this.schoolName, required this.role});
  final String schoolId;
  final String schoolName;
  final String role;
}

class SchoolRepository {
  SchoolRepository(this._c);
  final SupabaseClient _c;

  Future<School?> fetchSchool(String schoolId) async {
    final row = await _c.from('schools').select().eq('id', schoolId).maybeSingle();
    return row == null ? null : School.fromMap(row);
  }

  /// RLS only lets the head update; an empty result means no permission.
  Future<void> updateSchool(String id,
      {required String name, String? motto, required String primaryColor}) async {
    final rows = await _c
        .from('schools')
        .update({'name': name, 'motto': motto, 'primary_color': primaryColor})
        .eq('id', id)
        .select();
    if (rows.isEmpty) throw StateError('You do not have permission to change school settings.');
  }

  Future<List<Term>> fetchTerms() async {
    final rows = await _c.from('terms').select().order('starts_on', ascending: false);
    return rows.map<Term>((r) => Term.fromMap(r)).toList();
  }

  Future<void> addTerm({
    required String schoolId,
    required String name,
    required int year,
    required DateTime startsOn,
    required DateTime endsOn,
  }) async {
    await _c.from('terms').insert({
      'school_id': schoolId,
      'name': name,
      'year': year,
      'starts_on': formatDate(startsOn),
      'ends_on': formatDate(endsOn),
    });
  }

  Future<void> setCurrentTerm(String termId) =>
      _c.rpc('set_current_term', params: {'p_term_id': termId});

  Future<List<Membership>> fetchMyMemberships() async {
    final uid = _c.auth.currentUser?.id;
    if (uid == null) return [];
    final rows = await _c
        .from('memberships')
        .select('school_id, role, schools(name)')
        .eq('user_id', uid)
        .eq('status', 'active');
    return rows
        .map<Membership>((r) => Membership(
              schoolId: r['school_id'] as String,
              schoolName: ((r['schools'] as Map?)?['name'] as String?) ?? 'School',
              role: r['role'] as String,
            ))
        .toList();
  }

  /// Stores the choice server-side, then refreshes the token so claims point at the new school.
  Future<void> switchSchool(String schoolId) async {
    await _c.rpc('set_active_school', params: {'p_school_id': schoolId});
    await _c.auth.refreshSession();
  }
}

final schoolRepositoryProvider =
    Provider<SchoolRepository>((ref) => SchoolRepository(ref.watch(supabaseProvider)));

final schoolProvider = FutureProvider<School?>((ref) async {
  final schoolId = ref.watch(sessionInfoProvider)?.schoolId;
  if (schoolId == null) return null;
  return ref.watch(schoolRepositoryProvider).fetchSchool(schoolId);
});

final termsProvider = FutureProvider<List<Term>>((ref) async {
  if (ref.watch(sessionInfoProvider)?.schoolId == null) return [];
  return ref.watch(schoolRepositoryProvider).fetchTerms();
});

final membershipsProvider = FutureProvider<List<Membership>>((ref) async {
  ref.watch(sessionInfoProvider);
  return ref.watch(schoolRepositoryProvider).fetchMyMemberships();
});

/// Each school's own primary colour drives the app theme.
final brandColorProvider = Provider<Color>((ref) {
  return ref.watch(schoolProvider).maybeWhen(
        data: (s) => parseHexColor(s?.primaryColor),
        orElse: () => Brand.navy,
      );
});
