import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'app_database.g.dart';

// Local mirror of server tables used offline. IDs are UUIDs generated on device.

class Students extends Table {
  TextColumn get id => text()();
  TextColumn get schoolId => text()();
  TextColumn get admissionNo => text()();
  TextColumn get firstName => text()();
  TextColumn get lastName => text()();
  TextColumn get classId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  @override
  Set<Column> get primaryKey => {id};
}

class AttendanceRecords extends Table {
  TextColumn get id => text()();
  TextColumn get schoolId => text()();
  TextColumn get studentId => text()();
  TextColumn get attDate => text()(); // yyyy-MM-dd
  TextColumn get session => text().withDefault(const Constant('morning'))();
  TextColumn get status => text()();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();
  DateTimeColumn get updatedAt => dateTime()();
  @override
  Set<Column> get primaryKey => {id};
}

/// Last `updated_at` pulled per server table.
class SyncCursors extends Table {
  TextColumn get tableName => text()();
  TextColumn get cursor => text()();
  @override
  Set<Column> get primaryKey => {tableName};
}

/// Local changes waiting to be pushed (outbox pattern).
class Outbox extends Table {
  TextColumn get id => text()();
  TextColumn get targetTable => text()();
  TextColumn get op => text()(); // upsert | delete
  TextColumn get payload => text()(); // JSON
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get status => text().withDefault(const Constant('pending'))();
  DateTimeColumn get createdAt => dateTime()();
  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [Students, AttendanceRecords, SyncCursors, Outbox])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(driftDatabase(name: 'cylesoma'));

  @override
  int get schemaVersion => 1;
}
