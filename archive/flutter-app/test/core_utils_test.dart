import 'dart:convert';

import 'package:cylesoma/core/auth/auth_repository.dart';
import 'package:cylesoma/core/theme/app_theme.dart';
import 'package:cylesoma/core/util/format.dart';
import 'package:cylesoma/features/admin/invite_user_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

String _jwt(Map<String, dynamic> claims) {
  String enc(Object o) => base64Url.encode(utf8.encode(jsonEncode(o))).replaceAll('=', '');
  return '${enc({'alg': 'none'})}.${enc(claims)}.sig';
}

void main() {
  test('decodeJwtClaims reads school_id and user_role', () {
    final claims = decodeJwtClaims(_jwt({'school_id': 's1', 'user_role': 'head'}));
    expect(claims['school_id'], 's1');
    expect(claims['user_role'], 'head');
  });

  test('decodeJwtClaims returns empty map for malformed tokens', () {
    expect(decodeJwtClaims('garbage'), isEmpty);
  });

  test('parseHexColor accepts #RRGGBB and falls back otherwise', () {
    expect(parseHexColor('#0075E7'), const Color(0xFF0075E7));
    expect(parseHexColor('nope'), Brand.navy);
    expect(parseHexColor(null), Brand.navy);
  });

  test('roleLabel and formatDate', () {
    expect(roleLabel('teacher'), 'Teacher');
    expect(roleLabel('hod'), 'Head of department');
    expect(formatDate(DateTime(2027, 2, 1)), '2027-02-01');
  });

  test('invitableRoles mirrors the server rules', () {
    expect(invitableRoles('head'), contains('teacher'));
    expect(invitableRoles('registrar'), ['parent', 'student']);
    expect(invitableRoles('hr'), isNot(contains('head')));
    expect(invitableRoles('teacher'), isEmpty);
    expect(invitableRoles(null), isEmpty);
  });
}
